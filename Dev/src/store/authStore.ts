import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export interface StaffProfile {
  id: number;
  auth_id: string | null;
  email: string | null;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'member' | string;
  department_id: string | null;
  department_name: string | null;
  employment_level: string | null;
  job_title: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
  devLogin: (rememberMe?: boolean) => void;
  updateUserMetadata: (data: { full_name?: string; avatar_url?: string }) => Promise<void>;
}

let authListenerStarted = false;

const initialsFromName = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
const nameFromEmail = (email?: string | null) => (email || 'Staff').split('@')[0];

async function loadStaffProfile(authUser: User, markSignedIn = false): Promise<StaffProfile | null> {
  // department_id is imported data, not a PostgREST foreign-key relation.
  // Query it directly so a failed embedded relation never blocks login.
  const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title';
  let { data: row, error } = await supabase.from('users').select(fields).eq('auth_id', authUser.id).maybeSingle();
  if (error) throw error;

  // Imported staff records exist before their Supabase Auth accounts. On first login,
  // link the matching email to the account so the proper staff profile is retained.
  if (!row && authUser.email) {
    const byEmail = await supabase.from('users').select(fields).ilike('email', authUser.email).maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data) {
      const linked = await supabase.from('users')
        .update({ auth_id: authUser.id, last_sign_in_at: new Date().toISOString() })
        .eq('id', byEmail.data.id).select(fields).single();
      if (linked.error) throw linked.error;
      row = linked.data;
    }
  }

  // New authenticated staff members get an empty, correctly-owned profile instead
  // of inheriting demo data from a different person.
  if (!row) {
    const displayName = String(authUser.user_metadata?.full_name || nameFromEmail(authUser.email)).trim();
    const created = await supabase.from('users').insert({
      auth_id: authUser.id, email: authUser.email || null, name: displayName,
      initials: initialsFromName(displayName), role: 'member', is_active: true,
      last_sign_in_at: new Date().toISOString(),
    }).select(fields).single();
    if (created.error) throw created.error;
    row = created.data;
  } else if (markSignedIn) {
    const { error: signInError } = await supabase.from('users')
      .update({ last_sign_in_at: new Date().toISOString() }).eq('id', row.id);
    if (signInError) console.warn('Could not record staff sign-in:', signInError.message);
  }

  const { data: department } = row.department_id
    ? await supabase.from('departments').select('name').eq('id', row.department_id).maybeSingle()
    : { data: null };
  return { ...row, department_name: department?.name || null } as StaffProfile;
}

function enrichUser(authUser: User, profile: StaffProfile | null): User {
  return {
    ...authUser,
    user_metadata: {
      ...authUser.user_metadata,
      full_name: profile?.name || authUser.user_metadata?.full_name || nameFromEmail(authUser.email),
      role: profile?.role || 'member',
      department_id: profile?.department_id || null,
      department_name: profile?.department_name || null,
      employment_level: profile?.employment_level || null,
      job_title: profile?.job_title || null,
      profile_id: profile?.id || null,
    },
  } as User;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const applySession = async (session: Session | null, markSignedIn = false) => {
    const authUser = session?.user || null;
    if (!authUser) {
      set({ session: null, user: null, profile: null, loading: false });
      return;
    }
    if (authUser.id === 'dev-admin-id') return;

    try {
      const profile = await loadStaffProfile(authUser, markSignedIn);
      set({ session, profile, user: enrichUser(authUser, profile), loading: false });
    } catch (error) {
      console.error('Could not load staff profile:', error);
      // Keep an existing staff account usable even if an optional profile
      // enrichment query fails. This direct fallback is especially important
      // for Admin accounts, which do not belong to a department.
      try {
        const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title';
        const { data: fallback } = await supabase.from('users').select(fields).eq('auth_id', authUser.id).maybeSingle();
        const profile = fallback ? { ...fallback, department_name: null } as StaffProfile : null;
        set({ session, profile, user: enrichUser(authUser, profile), loading: false });
      } catch {
        set({ session, profile: null, user: enrichUser(authUser, null), loading: false });
      }
    }
  };

  return {
    session: null,
    user: null,
    profile: null,
    loading: true,

    initialize: async () => {
      try {
        const devSession = localStorage.getItem('kcoffee_dev_session');
        const isRememberMe = localStorage.getItem('kcoffee_auth_remember') === 'true';
        if (devSession) {
          if (!isRememberMe && !sessionStorage.getItem('kcoffee_session_active')) localStorage.removeItem('kcoffee_dev_session');
          else {
            sessionStorage.setItem('kcoffee_session_active', 'true');
            get().devLogin(isRememberMe);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
        if (!authListenerStarted) {
          authListenerStarted = true;
          supabase.auth.onAuthStateChange((event, nextSession) => {
            if (get().user?.id !== 'dev-admin-id') void applySession(nextSession, event === 'SIGNED_IN');
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        set({ loading: false });
      }
    },

    devLogin: (rememberMe = true) => {
      localStorage.setItem('kcoffee_dev_session', 'true');
      localStorage.setItem('kcoffee_auth_remember', rememberMe ? 'true' : 'false');
      sessionStorage.setItem('kcoffee_session_active', 'true');
      set({
        user: { id: 'dev-admin-id', email: 'admin@local', user_metadata: { full_name: 'Local Admin', role: 'admin', department_name: 'Local' } } as unknown as User,
        profile: null, session: { access_token: 'dev-token', refresh_token: 'dev-token' } as Session, loading: false,
      });
    },

    updateUserMetadata: async (data) => {
      const { user, profile } = get();
      const fullName = data.full_name?.trim() || profile?.name;
      if (!user || !fullName) throw new Error('Full name is required');
      if (user.id === 'dev-admin-id') {
        set({ user: { ...user, user_metadata: { ...user.user_metadata, full_name: fullName, avatar_url: data.avatar_url || user.user_metadata?.avatar_url } } as User });
        return;
      }

      const { data: updatedAuth, error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName, ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}) } });
      if (authError) throw authError;
      const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title';
      const { data: updatedProfile, error: profileError } = await supabase.from('users')
        .update({ name: fullName, initials: initialsFromName(fullName), ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}) }).eq('auth_id', user.id).select(fields).maybeSingle();
      if (profileError) throw profileError;
      const nextProfile = updatedProfile ? { ...updatedProfile, department_name: profile?.department_name || null } as StaffProfile : profile;
      set({ profile: nextProfile, user: enrichUser(updatedAuth.user || user, nextProfile) });
    },

    signOut: async () => {
      try { await supabase.auth.signOut(); }
      catch (error) { console.error('Error signing out:', error); }
      finally {
        localStorage.removeItem('kcoffee_dev_session');
        localStorage.removeItem('kcoffee_auth_remember');
        sessionStorage.removeItem('kcoffee_session_active');
        set({ session: null, user: null, profile: null });
      }
    },
  };
});

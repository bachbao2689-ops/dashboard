import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import {disablePush} from '../services/pushNotifications';

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
  is_active: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
  devLogin: (rememberMe?: boolean) => void;
  updateUserMetadata: (data: { full_name?: string; avatar_url?: string | null }) => Promise<void>;
}

let authListenerStarted = false;
let staffValidationStarted = false;
let initializing=false;

const nameFromEmail = (email?: string | null) => (email || 'Staff').split('@')[0];

async function loadStaffProfile(markSignedIn = false): Promise<StaffProfile | null> {
  const { data, error } = await supabase.rpc('account_get_current_profile', { p_mark_signed_in: markSignedIn });
  if (error) throw error;
  if (!data) return null;
  return data as StaffProfile;
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
  let sessionEpoch=0;
  const applySession = async (session: Session | null, markSignedIn = false) => {
    const epoch=++sessionEpoch;
    const authUser = session?.user || null;
    if (!authUser) {
      set({ session: null, user: null, profile: null, loading: false });
      return;
    }
    if (authUser.id === 'dev-admin-id') return;

    try {
      const profile = await loadStaffProfile(markSignedIn);
      if(epoch!==sessionEpoch)return;
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null, loading: false });
        return;
      }
      if (!profile) {
        await supabase.auth.signOut().catch(() => undefined);
        set({ session: null, user: null, profile: null, loading: false });
        return;
      }
      set({ session, profile, user: enrichUser(authUser, profile), loading: false });
    } catch (error) {
      if(epoch!==sessionEpoch)return;
      console.error('Could not load staff profile:', error);
      // Never grant dashboard access using JWT metadata if the active staff
      // account could not be verified by the database.
      await supabase.auth.signOut().catch(() => undefined);
      if(epoch!==sessionEpoch)return;
      set({ session: null, profile: null, user: null, loading: false });
      return;
    }
  };

  return {
    session: null,
    user: null,
    profile: null,
    loading: true,

    initialize: async () => {
      if(initializing)return;initializing=true;
      try {
        const isLocalDev = Boolean(import.meta.env.DEV && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
        if (!isLocalDev && typeof window !== 'undefined') {
          localStorage.removeItem('kcoffee_dev_session');
        }
        const devSession = isLocalDev ? localStorage.getItem('kcoffee_dev_session') : null;
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
            if (get().user?.id === 'dev-admin-id')return;
            if(nextSession&&get().profile&&get().user?.id===nextSession.user.id){set({session:nextSession,user:enrichUser(nextSession.user,get().profile)});return;}
            // Database calls must run outside the Auth callback's internal lock.
            setTimeout(()=>void applySession(nextSession,event==='SIGNED_IN'),0);
          });
        }
        if (!staffValidationStarted) {
          staffValidationStarted = true;
          window.setInterval(() => {
            if (document.visibilityState==='visible'&&get().session && get().user?.id !== 'dev-admin-id') void applySession(get().session);
          }, 300_000);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        set({ loading: false });
      }
      finally{initializing=false;}
    },

    devLogin: (rememberMe = true) => {
      const isAllowed = Boolean(import.meta.env.DEV && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
      if (!isAllowed) {
        console.warn('devLogin is restricted to local development environment.');
        return;
      }
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
        set({ user: { ...user, user_metadata: { ...user.user_metadata, full_name: fullName, avatar_url: 'avatar_url' in data ? data.avatar_url : user.user_metadata?.avatar_url } } as User });
        return;
      }

      const { data: updatedAuth, error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName, ...('avatar_url' in data ? { avatar_url: data.avatar_url } : {}) } });
      if (authError) throw authError;
      const { data: updatedProfile, error: profileError } = await supabase.rpc('account_update_my_profile', {
        p_name: fullName,
        p_avatar_url: data.avatar_url ?? null,
        p_update_avatar: 'avatar_url' in data,
      });
      if (profileError) throw profileError;
      const nextProfile = updatedProfile ? { ...updatedProfile, department_name: profile?.department_name || null } as StaffProfile : profile;
      set({ profile: nextProfile, user: enrichUser(updatedAuth.user || user, nextProfile) });
    },

    signOut: async () => {
      sessionEpoch++;
      try { await disablePush(); } catch { /* Auth session revocation also stops queued push. */ }
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

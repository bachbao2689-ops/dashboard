import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import {disablePush} from '../services/pushNotifications';
import {retainWorkspaceRealtime} from '../services/workspaceRealtime';
import {readAdminPreview,startAdminPreview,stopAdminPreview,authSessionIdentity} from '../services/adminPreview';

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
  originalProfile: StaffProfile | null;
  previewExpiresAt: string | null;
  previewBusy: boolean;
  scopeRevision: number;
  setTestActor: (id:number)=>Promise<void>;
  restoreAdmin: ()=>Promise<void>;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
  devLogin: (rememberMe?: boolean) => void;
  updateUserMetadata: (data: { full_name?: string; avatar_url?: string | null }) => Promise<void>;
}

let authListenerStarted = false;
let staffValidationStarted = false;
let initializing=false;

const initialsFromName = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
const nameFromEmail = (email?: string | null) => (email || 'Staff').split('@')[0];

async function loadStaffProfile(authUser: User, markSignedIn = false): Promise<StaffProfile | null> {
  // department_id is imported data, not a PostgREST foreign-key relation.
  // Query it directly so a failed embedded relation never blocks login.
  const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title, is_active';
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
  let sessionEpoch=0;
  const applySession = async (session: Session | null, markSignedIn = false) => {
    const epoch=++sessionEpoch;
    const authUser=session?.user||null;
    if(!authUser){set({session:null,user:null,profile:null,originalProfile:null,previewExpiresAt:null,previewBusy:false,loading:false});return;}
    if(authUser.id==='dev-admin-id')return;
    if(get().session&&authSessionIdentity(get().session)!==authSessionIdentity(session))set(s=>({profile:null,originalProfile:null,previewExpiresAt:null,previewBusy:false,scopeRevision:s.scopeRevision+1}));
    try{
      let original:StaffProfile|null;
      try{original=await loadStaffProfile(authUser,markSignedIn);}
      catch(error){
        console.error('Could not enrich staff profile:',error);
        const {data,error:profileError}=await supabase.from('users').select('id,auth_id,email,name,avatar_url,role,department_id,employment_level,job_title,is_active').eq('auth_id',authUser.id).maybeSingle();
        if(profileError)throw profileError;
        original=data?{...data,department_name:null} as StaffProfile:null;
      }
      if(epoch!==sessionEpoch)return;
      if(original?.is_active===false){await supabase.auth.signOut();set({session:null,user:null,profile:null,originalProfile:null,previewExpiresAt:null,loading:false});return;}
      set({originalProfile:original});
      const preview=original?await readAdminPreview(supabase):{active:false};
      if(epoch!==sessionEpoch)return;
      const effective=preview.active?preview.actor!:original;
      set({session,profile:effective,originalProfile:original,previewExpiresAt:preview.active?preview.expires_at!:null,user:enrichUser(authUser,effective),loading:false});
    }catch(error){
      if(epoch!==sessionEpoch)return;
      console.error('Could not confirm account/test context:',error);
      // A failed switch may already be committed server-side. Keep recovery
      // controls, but never substitute Admin data after a transport failure.
      set({session,profile:null,previewExpiresAt:null,user:enrichUser(authUser,null),loading:false});
    }
  };

  return {
    session: null,
    user: null,
    profile: null,
    originalProfile: null,
    previewExpiresAt: null,
    previewBusy: false,
    scopeRevision: 0,
    setTestActor: async(id:number)=>{
      if(get().previewBusy)return;
      const original=get().originalProfile;
      if(original?.role!=='admin'||!get().session||get().session?.access_token==='dev-token')throw new Error('Đăng nhập Admin thật để thử thao tác theo cấp bậc.');
      if(id===original.id)return get().restoreAdmin();
      const epoch=++sessionEpoch;
      set(state=>({previewBusy:true,profile:null,scopeRevision:state.scopeRevision+1}));
      try{
        const next=await startAdminPreview(supabase,id);
        if(epoch!==sessionEpoch)throw new Error('Phiên đăng nhập đã thay đổi. Tải lại trước khi thử tiếp.');
        set({profile:next.actor!,previewExpiresAt:next.expires_at!,user:enrichUser(get().session!.user,next.actor!)});
      }
      catch(error){if(get().originalProfile?.auth_id===original.auth_id)set({profile:null});throw error;}
      finally{set({previewBusy:false});}
    },
    restoreAdmin: async()=>{
      if(get().previewBusy)return;
      const epoch=++sessionEpoch;const original=get().originalProfile;
      if(!original||!get().session||get().session?.access_token==='dev-token')throw new Error('Đăng nhập Admin thật để khôi phục phiên.');
      set(state=>({previewBusy:true,profile:null,scopeRevision:state.scopeRevision+1}));
      try{
        await stopAdminPreview(supabase);
        if(epoch!==sessionEpoch)throw new Error('Phiên đăng nhập đã thay đổi. Tải lại trước khi thử tiếp.');
        // Reload rank/department rather than resurrecting a stale Admin profile.
        await applySession(get().session);
        if(!get().profile)throw new Error('Chưa xác nhận được scope tài khoản gốc. Tải lại để thử lại.');
      }
      catch(error){if(get().originalProfile?.auth_id===original?.auth_id)set({profile:null});throw error;}
      finally{set({previewBusy:false});}
    },
    loading: true,

    initialize: async () => {
      if(initializing)return;initializing=true;
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kcoffee_dev_session');
        }

        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
        if (!authListenerStarted) {
          authListenerStarted = true;
          supabase.auth.onAuthStateChange((event, nextSession) => {
            if (get().user?.id === 'dev-admin-id')return;
            if(nextSession&&authSessionIdentity(get().session)===authSessionIdentity(nextSession)){set({session:nextSession,user:enrichUser(nextSession.user,get().profile)});return;}
            // Database calls must run outside the Auth callback's internal lock.
            setTimeout(()=>void applySession(nextSession,event==='SIGNED_IN'),0);
          });
        }
        if (!staffValidationStarted) {
          if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('storage',event=>{
              if(event.key==='kcoffee_admin_test_changed'&&get().session){
                set(state=>({profile:null,scopeRevision:state.scopeRevision+1}));
                void applySession(get().session);
              }
            });
          }
          staffValidationStarted = true;
          let release: (() => void) | undefined;
          let bindingKey: string | undefined;
          let expiryTimer: ReturnType<typeof setTimeout> | undefined;
          let expiry: string | null = null;
          const refreshIdentity = () => {
            if (document.visibilityState === 'visible' && get().session && get().user?.id !== 'dev-admin-id') {
              return applySession(get().session);
            }
          };
          const bindIdentity = () => {
            const state=get();
            if(state.previewExpiresAt!==expiry){
              clearTimeout(expiryTimer);expiry=state.previewExpiresAt;
              if(expiry)expiryTimer=setTimeout(()=>{
                set(s=>({profile:null,scopeRevision:s.scopeRevision+1}));
                if(get().session)void applySession(get().session);
              },Math.max(0,Date.parse(expiry)-Date.now())+50);
            }
            const next = state.session && state.user?.id !== 'dev-admin-id'
              ? state.originalProfile?.id : undefined;
            const effective=state.profile?.id;
            const key=next?`${next}:${effective}`:undefined;
            if (key === bindingKey) return;
            release?.(); bindingKey=key;
            release = next ? retainWorkspaceRealtime(next, ['users','departments'], refreshIdentity, () => {}, change =>
              !change.table || change.table === 'departments' || !change.new?.id && !change.old?.id
                || [next,effective].includes(Number(change.new?.id || change.old?.id))) : undefined;
          };
          useAuthStore.subscribe(bindIdentity);
          bindIdentity();

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
      const devProfile: StaffProfile = {
        id: 999999,
        auth_id: 'dev-admin-id',
        email: 'admin@local',
        name: 'Local Admin',
        avatar_url: null,
        role: 'admin',
        department_id: null,
        department_name: 'Local',
        employment_level: 'Manager',
        job_title: 'Administrator',
        is_active: true,
      };
      set({
        user: { id: 'dev-admin-id', email: 'admin@local', user_metadata: { full_name: 'Local Admin', role: 'admin', department_name: 'Local' } } as unknown as User,
        profile: devProfile, originalProfile: devProfile, session: { access_token: 'dev-token', refresh_token: 'dev-token' } as Session, loading: false,
      });
    },

    updateUserMetadata: async (data) => {
      const epoch=sessionEpoch;
      const { user, profile, originalProfile } = get();
      if(!profile||get().previewBusy||originalProfile&&profile.id!==originalProfile.id)throw new Error('Khôi phục tài khoản gốc trước khi chỉnh sửa hồ sơ.');
      const fullName = data.full_name?.trim() || profile?.name;
      if (!user || !fullName) throw new Error('Full name is required');
      if (user.id === 'dev-admin-id') {
        set({ user: { ...user, user_metadata: { ...user.user_metadata, full_name: fullName, avatar_url: 'avatar_url' in data ? data.avatar_url : user.user_metadata?.avatar_url } } as User });
        return;
      }

      const { data: updatedAuth, error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName, ...('avatar_url' in data ? { avatar_url: data.avatar_url } : {}) } });
      if (authError) throw authError;
      const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title, is_active';
      const { data: updatedProfile, error: profileError } = await supabase.from('users')
        .update({ name: fullName, initials: initialsFromName(fullName), ...('avatar_url' in data ? { avatar_url: data.avatar_url } : {}) }).eq('auth_id', user.id).select(fields).maybeSingle();
      if (profileError) throw profileError;
      const nextProfile = updatedProfile ? { ...updatedProfile, department_name: profile?.department_name || null } as StaffProfile : profile;
      if(epoch===sessionEpoch)set({ profile: nextProfile, originalProfile: nextProfile, user: enrichUser(updatedAuth.user || user, nextProfile) });
    },

    signOut: async () => {
      sessionEpoch++;
      try { if(get().originalProfile?.role==='admin')await stopAdminPreview(supabase); } catch { /* Logout still revokes the real Auth session. */ }
      try { await disablePush(); } catch { /* Auth session revocation also stops queued push. */ }
      try { await supabase.auth.signOut(); }
      catch (error) { console.error('Error signing out:', error); }
      finally {
        localStorage.removeItem('kcoffee_dev_session');
        localStorage.removeItem('kcoffee_auth_remember');
        sessionStorage.removeItem('kcoffee_session_active');
        set({ session: null, user: null, profile: null, originalProfile: null,previewExpiresAt:null,previewBusy:false });
      }
    },
  };
});

/** Auth/password/avatar operations still belong to the signed-in identity. */
export function assertOwnAuthAccount(){
 const {profile,originalProfile,previewBusy,previewExpiresAt}=useAuthStore.getState();
 if(!profile||!originalProfile||profile.id!==originalProfile.id||previewBusy||previewExpiresAt)throw new Error('Khôi phục tài khoản gốc trước khi chỉnh sửa hồ sơ hoặc mật khẩu.');
}

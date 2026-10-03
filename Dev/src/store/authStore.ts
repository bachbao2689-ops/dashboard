import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
  devLogin: (rememberMe?: boolean) => void;
  updateUserMetadata: (data: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  initialize: async () => {
    try {
      // Check for dev session first
      const devSession = localStorage.getItem('kcoffee_dev_session');
      const isRememberMe = localStorage.getItem('kcoffee_auth_remember') === 'true';
      
      if (devSession) {
        if (!isRememberMe && !sessionStorage.getItem('kcoffee_session_active')) {
          // If not remember me and it's a new tab/window, clear it
          localStorage.removeItem('kcoffee_dev_session');
        } else {
          sessionStorage.setItem('kcoffee_session_active', 'true');
          get().devLogin(isRememberMe);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      // Only set if not already overridden by devLogin
      if (!get().user || get().user?.id !== 'dev-admin-id') {
        set({ session, user: session?.user || null, loading: false });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        if (!get().user || get().user?.id !== 'dev-admin-id') {
          set({ session, user: session?.user || null });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  devLogin: (rememberMe: boolean = true) => {
    localStorage.setItem('kcoffee_dev_session', 'true');
    localStorage.setItem('kcoffee_auth_remember', rememberMe ? 'true' : 'false');
    sessionStorage.setItem('kcoffee_session_active', 'true');
    set({
      user: { id: 'dev-admin-id', email: 'admin@local', user_metadata: { full_name: 'Local Admin' } } as unknown as User,
      session: { access_token: 'dev-token', refresh_token: 'dev-token' } as any,
      loading: false
    });
  },

  updateUserMetadata: async (data: any) => {
    const { user } = get();
    if (!user) return;
    
    // For local dev admin bypass
    if (user.id === 'dev-admin-id') {
      set({ user: { ...user, user_metadata: { ...user.user_metadata, ...data } } as any });
      return;
    }
    
    // For real Supabase auth
    const { data: updatedUser, error } = await supabase.auth.updateUser({ data });
    if (!error && updatedUser.user) {
      set({ user: updatedUser.user });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      localStorage.removeItem('kcoffee_dev_session');
      localStorage.removeItem('kcoffee_auth_remember');
      sessionStorage.removeItem('kcoffee_session_active');
      set({ session: null, user: null });
    }
  },
}));

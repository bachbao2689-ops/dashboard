import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
  devLogin: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  initialize: async () => {
    try {
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

  devLogin: () => {
    set({
      user: { id: 'dev-admin-id', email: 'admin@local', user_metadata: { full_name: 'Local Admin' } } as unknown as User,
      session: { access_token: 'dev-token', refresh_token: 'dev-token' } as any,
      loading: false
    });
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      set({ session: null, user: null });
    }
  },
}));

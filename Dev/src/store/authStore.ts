import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user || null, loading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user || null });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));

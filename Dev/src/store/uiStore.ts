import { create } from 'zustand';
import { userCache } from '../lib/userCache';
import { useAuthStore } from './authStore';

interface UiState {
  theme: 'light' | 'dark';
  lang: 'en' | 'vi';
  isSidebarOpen: boolean;
  toggleTheme: () => void;
  setLang: (lang: 'en' | 'vi') => void;
  toggleSidebar: () => void;
  syncWithUser: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  lang: 'vi',
  isSidebarOpen: true,
  toggleTheme: () => {
    const profileId = useAuthStore.getState().profile?.id;
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      userCache.set(profileId, 'theme', newTheme);
      return { theme: newTheme };
    });
  },
  setLang: (lang) => {
    const profileId = useAuthStore.getState().profile?.id;
    userCache.set(profileId, 'lang', lang);
    set({ lang });
  },
  toggleSidebar: () => {
    const profileId = useAuthStore.getState().profile?.id;
    set((state) => {
      const newState = !state.isSidebarOpen;
      userCache.set(profileId, 'sidebar', newState);
      return { isSidebarOpen: newState };
    });
  },
  syncWithUser: () => {
    const profileId = useAuthStore.getState().profile?.id;
    if (!profileId) return;
    
    const cachedTheme = userCache.get<'light' | 'dark'>(profileId, 'theme', 'light');
    const cachedLang = userCache.get<'en' | 'vi'>(profileId, 'lang', 'vi');
    const cachedSidebar = userCache.get<boolean>(profileId, 'sidebar', true);
    
    if (cachedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    set({ theme: cachedTheme, lang: cachedLang, isSidebarOpen: cachedSidebar });
  }
}));

// Automatically sync when profile changes
useAuthStore.subscribe((state, prevState) => {
  if (state.profile?.id !== prevState.profile?.id) {
    useUiStore.getState().syncWithUser();
  }
});

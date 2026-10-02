import { create } from 'zustand';

interface UiState {
  theme: 'light' | 'dark';
  lang: 'en' | 'vi';
  toggleTheme: () => void;
  setLang: (lang: 'en' | 'vi') => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  lang: 'en',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { theme: newTheme };
  }),
  setLang: (lang) => set({ lang }),
}));

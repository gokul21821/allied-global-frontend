import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize theme from storage
if (typeof window !== 'undefined') {
  const isDarkMode = useThemeStore.getState().isDarkMode;
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
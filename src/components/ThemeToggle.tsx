import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../lib/store';

export const ThemeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const handleToggle = () => {
    toggleDarkMode();
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-dark-100"
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};
import React from 'react';
import { languages } from '../lib/constants';

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const LanguageSelect = ({ value, onChange }: LanguageSelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border-2 border-primary bg-white dark:bg-dark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};
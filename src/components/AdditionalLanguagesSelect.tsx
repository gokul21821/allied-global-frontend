import React, { useState, useEffect, useRef } from 'react';
import { languages } from '../lib/constants';
import { X, ChevronDown, Info } from 'lucide-react';

// Language code to flag emoji mapping
const languageFlags: { [key: string]: string } = {
  'ar': '🇸🇦', // Arabic - Saudi Arabia
  'bg': '🇧🇬', // Bulgarian
  'zh': '🇨🇳', // Chinese
  'hr': '🇭🇷', // Croatian
  'cs': '🇨🇿', // Czech
  'da': '🇩🇰', // Danish
  'nl': '🇳🇱', // Dutch
  'en': '🇺🇸', // English
  'fi': '🇫🇮', // Finnish
  'fr': '🇫🇷', // French
  'de': '🇩🇪', // German
  'el': '🇬🇷', // Greek
  'hi': '🇮🇳', // Hindi
  'hu': '🇭🇺', // Hungarian
  'id': '🇮🇩', // Indonesian
  'it': '🇮🇹', // Italian
  'ja': '🇯🇵', // Japanese
  'ko': '🇰🇷', // Korean
  'ms': '🇲🇾', // Malay
  'no': '🇳🇴', // Norwegian
  'pl': '🇵🇱', // Polish
  'pt-br': '🇧🇷', // Portuguese (Brazil)
  'pt': '🇵🇹', // Portuguese (Portugal)
  'ro': '🇷🇴', // Romanian
  'ru': '🇷🇺', // Russian
  'sk': '🇸🇰', // Slovak
  'es': '🇪🇸', // Spanish
  'sv': '🇸🇪', // Swedish
  'ta': '🇮🇳', // Tamil
  'tr': '🇹🇷', // Turkish
  'uk': '🇺🇦', // Ukrainian
  'vi': '🇻🇳', // Vietnamese
};

interface AdditionalLanguage {
  language_code: string;
  voice_id?: string;
  first_message?: string;
}

interface AdditionalLanguagesSelectProps {
  primaryLanguage: string;
  additionalLanguages: AdditionalLanguage[];
  onChange: (languages: AdditionalLanguage[]) => void;
  languageDetectionEnabled?: boolean;
  onLanguageDetectionChange?: (enabled: boolean) => void;
}

export const AdditionalLanguagesSelect = ({
  primaryLanguage,
  additionalLanguages,
  onChange,
  languageDetectionEnabled = false,
  onLanguageDetectionChange,
}: AdditionalLanguagesSelectProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Get available languages (exclude primary language and already added languages)
  const availableLanguages = languages.filter(
    (lang) =>
      lang.code !== primaryLanguage &&
      !additionalLanguages.some((al) => al.language_code === lang.code)
  );

  const handleAddLanguage = (languageCode: string) => {
    const newLanguage: AdditionalLanguage = {
      language_code: languageCode,
    };
    onChange([...additionalLanguages, newLanguage]);
  };

  const handleRemoveLanguage = (languageCode: string) => {
    const updated = additionalLanguages.filter((al) => al.language_code !== languageCode);
    onChange(updated);
  };

  const getLanguageName = (code: string) => {
    const language = languages.find((lang) => lang.code === code);
    return language ? language.name : code;
  };

  const getLanguageFlag = (code: string) => {
    return languageFlags[code] || '🌐';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Specify additional languages which callers can choose from.
        </p>
        
        {/* Multiselect Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className={`w-full min-h-[42px] px-3 py-2 text-left bg-white dark:bg-dark-100 border-2 rounded-lg border-gray-200 dark:border-dark-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              additionalLanguages.length > 0 ? 'py-2' : 'py-2.5'
            }`}
          >
            {additionalLanguages.length === 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Select additional languages...
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
            ) : (
              <div className="flex items-center flex-wrap gap-2">
                {additionalLanguages.map((lang) => (
                  <div
                    key={lang.language_code}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gray-100 dark:bg-dark-50 rounded-md text-sm text-gray-900 dark:text-white"
                  >
                    <span className="text-base">{getLanguageFlag(lang.language_code)}</span>
                    <span>{getLanguageName(lang.language_code)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLanguage(lang.language_code);
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
              </div>
            )}
          </button>

          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-100 max-h-60 overflow-y-auto">
              <div className="p-2">
                {availableLanguages.length > 0 ? (
                  availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        handleAddLanguage(lang.code);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{getLanguageFlag(lang.code)}</span>
                        <span>{lang.name}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No additional languages available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {additionalLanguages.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To support additional languages, language overrides will be enabled. You can view and configure all overrides in the 'Security' tab.
          </p>
        )}
      </div>

      {/* Language Detection Recommendation */}
      {additionalLanguages.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-50">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              We recommend enabling language detection for optimal conversation experience
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={languageDetectionEnabled}
              onChange={(e) => {
                if (onLanguageDetectionChange) {
                  onLanguageDetectionChange(e.target.checked);
                }
              }}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${
              languageDetectionEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
            }`}></div>
          </label>
        </div>
      )}
    </div>
  );
};

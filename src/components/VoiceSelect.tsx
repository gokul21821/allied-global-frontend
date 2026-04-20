import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronsUpDown } from 'lucide-react';


/**
 * Voice labels interface
 */
interface VoiceLabels {
  accent?: string;
  description?: string;
  age?: string;
  gender?: string;
  use_case?: string;
}

/**
 * Single voice object interface
 */
interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  labels?: VoiceLabels;
}

/**
 * Props for our custom VoiceSelect dropdown
 */
interface VoiceSelectProps {
  voices: Voice[];
  selectedVoiceId: string;
  onChange: (voiceId: string) => void;
  className?: string; // optional styling override
}

export function VoiceSelect({
  voices,
  selectedVoiceId,
  onChange,
  className = '',
}: VoiceSelectProps) {
  // Find the "selected" voice in the voices array
  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId) || null;

  // Simple audio playback
  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <div className={className}>
      <Listbox
        value={selectedVoiceId}
        onChange={(newVoiceId) => onChange(newVoiceId)}
      >
        <div className="relative">
          {/* The “closed” state button */}
          <Listbox.Button
            className="
              relative w-full cursor-default rounded-md bg-white dark:bg-dark-200 py-2 pl-3 pr-10
              text-left border border-gray-300 dark:border-dark-100
              shadow-sm focus:outline-none focus:ring-1 focus:ring-primary
              transition-colors
            "
          >
            <span className="block truncate">
              {selectedVoice ? selectedVoice.name : 'Select a Voice'}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" />
            </span>
          </Listbox.Button>

          {/* The dropdown list of voices */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className="
                absolute z-10 mt-1 max-h-60 w-full overflow-auto
                rounded-md bg-white dark:bg-dark-200 py-1 text-base
                shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
              "
            >
              {voices.map((voice) => {
                const isSelected = voice.voice_id === selectedVoiceId;
                return (
                  <Listbox.Option
                    key={voice.voice_id}
                    className={({ active }) =>
                      `
                        relative cursor-pointer select-none py-2 pl-3 pr-9
                        ${
                          active
                            ? 'bg-primary/10 dark:bg-primary-400/10 text-primary dark:text-primary-300'
                            : 'text-gray-900 dark:text-gray-100'
                        }
                      `
                    }
                    value={voice.voice_id}
                  >
                    {({ selected, active }) => (
                      <div className="flex items-start justify-between">
                        {/* Left side: voice name & labels */}
                        <div className="flex-1">
                          <p className="font-medium">{voice.name}</p>
                          {/* Labels (accent, desc, etc.) in smaller text */}
                          {voice.labels && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {voice.labels.accent
                                ? `Accent: ${voice.labels.accent} | `
                                : ''}
                              {voice.labels.description
                                ? `Desc: ${voice.labels.description} | `
                                : ''}
                              {voice.labels.age ? `Age: ${voice.labels.age} | ` : ''}
                              {voice.labels.gender ? `Gender: ${voice.labels.gender} | ` : ''}
                              {voice.labels.use_case ? `Use: ${voice.labels.use_case}` : ''}
                            </p>
                          )}
                        </div>

                        {/* Right side: Play icon + check if selected */}
                        <div className="flex items-center space-x-2 mr-2">
                          {/* Play button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // So we don't close the dropdown
                              playAudio(voice.preview_url);
                            }}
                            className="
                              text-gray-400 hover:text-primary dark:hover:text-primary-300
                              focus:outline-none
                            "
                          >
                            <Play className="w-4 h-4" />
                          </button>

                          {/* Check if this option is chosen */}
                          {selected && (
                            <span className="text-primary dark:text-primary-300">
                              <Check className="h-5 w-5" />
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Optional extra “preview” section below the dropdown */}
      {selectedVoice && (
        <div className="mt-3 bg-gray-50 dark:bg-dark-100 p-3 rounded-md">
          <button
            onClick={() => playAudio(selectedVoice.preview_url)}
            className="px-3 py-2 bg-primary hover:bg-primary-600 text-white rounded-md"
          >
            Preview "{selectedVoice.name}"
          </button>
        </div>
      )}
    </div>
  );
}

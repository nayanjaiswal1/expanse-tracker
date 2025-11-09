import React from 'react';
import { SettingsDropdown } from './SettingsDropdown';
import { COUNTRIES, getCountryByName } from '../../../utils/countries';
import type { Country } from '../../../utils/countries';

interface OnboardingHeaderProps {
  selectedCountry: string;
  selectedLanguage: string;
  selectedTheme: 'system' | 'light' | 'dark';
  onCountryChange: (country: string) => void;
  onLanguageChange: (language: string) => void;
  onThemeChange: (theme: 'system' | 'light' | 'dark') => void;
}

const languageOptions = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
];

const themeOptions = [
  { value: 'system' as const, label: 'System', icon: '💻' },
  { value: 'light' as const, label: 'Light', icon: '☀️' },
  { value: 'dark' as const, label: 'Dark', icon: '🌙' },
];

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  selectedCountry,
  selectedLanguage,
  selectedTheme,
  onCountryChange,
  onLanguageChange,
  onThemeChange,
}) => {
  const getSelectedCountryData = (): Country => {
    return getCountryByName(selectedCountry) || COUNTRIES[0];
  };

  const getSelectedLanguage = () => {
    return languageOptions.find((l) => l.value === selectedLanguage) || languageOptions[0];
  };

  const getSelectedTheme = () => {
    return themeOptions.find((t) => t.value === selectedTheme) || themeOptions[0];
  };

  const countryOptions = COUNTRIES.map((country) => ({
    value: country.name,
    label: country.name,
    flag: country.flag,
  }));

  return (
    <header className="flex items-start justify-between">
      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Complete your setup
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Tell us about yourself and set your preferences
        </p>
      </div>

      {/* Settings Icon Dropdowns */}
      <div className="flex items-center gap-1.5 ml-4">
        {/* Country Dropdown */}
        <SettingsDropdown
          icon={
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          selectedValue={selectedCountry}
          selectedLabel={getSelectedCountryData().name}
          selectedIcon={getSelectedCountryData().flag}
          options={countryOptions}
          onSelect={onCountryChange}
          title={`Country: ${getSelectedCountryData().name}`}
          dropdownWidth="w-64"
        />

        {/* Language Dropdown */}
        <SettingsDropdown
          icon={
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
          }
          selectedValue={selectedLanguage}
          selectedLabel={getSelectedLanguage().label}
          selectedIcon={getSelectedLanguage().flag}
          options={languageOptions}
          onSelect={onLanguageChange}
          title={`Language: ${getSelectedLanguage().label}`}
          dropdownWidth="w-48"
        />

        {/* Theme Dropdown */}
        <SettingsDropdown
          icon={getSelectedTheme().icon}
          selectedValue={selectedTheme}
          selectedLabel={getSelectedTheme().label}
          options={themeOptions}
          onSelect={(value) => onThemeChange(value as 'system' | 'light' | 'dark')}
          title={`Theme: ${getSelectedTheme().label}`}
          dropdownWidth="w-40"
        />
      </div>
    </header>
  );
};

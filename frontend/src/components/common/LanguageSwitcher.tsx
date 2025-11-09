import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLanguages } from '../../contexts/ReferenceDataContext';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { languages, isLoading } = useLanguages();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Show loading state or fallback if data is not ready
  if (isLoading || languages.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <Globe className="h-6 w-6 text-gray-500" />
        <select
          onChange={(e) => changeLanguage(e.target.value)}
          value={i18n.language}
          className="ml-2 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

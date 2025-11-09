import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './locales';

const namespaces = ['common', 'finance', 'settings', 'auth', 'shared'] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'es', 'hi'],
    fallbackLng: 'en',
    defaultNS: 'common',
    fallbackNS: ['common', 'shared'],
    ns: namespaces,
    debug: false,
    keySeparator: '.',
    nsSeparator: ':',
    detection: {
      order: ['path', 'cookie', 'htmlTag'],
      caches: ['cookie'],
    },
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

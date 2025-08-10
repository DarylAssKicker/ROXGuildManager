import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from '../locales/en/common.json';
import zhCNCommon from '../locales/zh-CN/common.json';
import zhTWCommon from '../locales/zh-TW/common.json';

// Supported language list
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' }
];

// Translation resources
const resources = {
  en: {
    common: enCommon
  },
  'zh-CN': {
    common: zhCNCommon
  },
  'zh-TW': {
    common: zhTWCommon
  }
};

// Get browser language setting (but default to English)
const getBrowserLanguage = (): string => {
  // Default language set to English
  return 'en';
};

// Get saved language setting
const getSavedLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('rox-guild-language');
    if (saved && supportedLanguages.some(lang => lang.code === saved)) {
      return saved;
    }
  }
  return getBrowserLanguage();
};

// Save language setting
export const saveLanguage = (languageCode: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rox-guild-language', languageCode);
  }
};

// Initialize i18n
i18n
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    lng: getSavedLanguage(), // Default language
    fallbackLng: 'en', // Fallback language
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common'],
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already safely escapes
    },
    
    // Debug mode (only enabled in development environment)
    debug: (import.meta as any).env?.MODE === 'development',
    
    // Cache configuration
    saveMissing: (import.meta as any).env?.MODE === 'development', // Only save missing translations in development environment
    
    // React specific configuration
    react: {
      useSuspense: false, // Disable Suspense to avoid loading issues
    },
    
    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Language switching function
export const changeLanguage = (languageCode: string): Promise<any> => {
  saveLanguage(languageCode);
  return i18n.changeLanguage(languageCode);
};

// Get current language info
export const getCurrentLanguage = () => {
  const currentLang = i18n.language;
  return supportedLanguages.find(lang => lang.code === currentLang) || supportedLanguages[0];
};

// Get current language code
export const getCurrentLanguageCode = (): string => {
  return i18n.language || 'en';
};

// Check if RTL language (currently supported languages are all LTR)
export const isRTL = (): boolean => {
  return false; // Currently supported languages are all left-to-right
};

export default i18n;
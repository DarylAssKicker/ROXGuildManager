import { useTranslation as useI18nTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, supportedLanguages } from '../i18n';

// Type definitions
export interface TranslationHook {
  t: (key: string, options?: any) => string;
  i18n: any;
  ready: boolean;
  currentLanguage: {
    code: string;
    name: string;
    nativeName: string;
  };
  supportedLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
  changeLanguage: (languageCode: string) => Promise<any>;
  isLoading: boolean;
}

// Custom useTranslation hook
export const useTranslation = (namespace: string = 'common'): TranslationHook => {
  const { t, i18n, ready } = useI18nTranslation(namespace);
  
  return {
    t: (key: string, options?: any) => String(t(key, options)),
    i18n,
    ready,
    currentLanguage: getCurrentLanguage(),
    supportedLanguages,
    changeLanguage,
    isLoading: !ready,
  };
};

// Convenient translation function (for use outside components)
export const translate = (key: string, options?: any): string => {
  const { t } = useI18nTranslation();
  return String(t(key, options));
};

// Helper function for formatting translation text
export const formatTranslation = (key: string, values: Record<string, any> = {}): string => {
  const { t } = useI18nTranslation();
  return String(t(key, values));
};

// Helper function for getting nested translations
export const getNestedTranslation = (namespace: string, key: string): string => {
  const { t } = useI18nTranslation(namespace);
  return t(key);
};

export default useTranslation;
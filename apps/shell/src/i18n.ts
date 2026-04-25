import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@bilko/platform-core/locales';

export async function initI18n(): Promise<void> {
  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
      },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
}

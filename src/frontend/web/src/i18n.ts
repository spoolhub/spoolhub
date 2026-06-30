import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import es from '@/locales/es.json'
import sv from '@/locales/sv.json'

i18n
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('language') ?? 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      es: { translation: es },
      sv: { translation: sv },
    },
    interpolation: { escapeValue: false },
  })

export default i18n

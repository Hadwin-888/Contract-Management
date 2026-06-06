import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import en from './locales/en'

// Detect browser language, default to Chinese
function getBrowserLocale(): string {
  const stored = localStorage.getItem('locale')
  if (stored) return stored

  const browserLang = navigator.language || (navigator as any).browserLanguage || ''
  if (browserLang.startsWith('en')) return 'en'
  return 'zh-CN'
}

const i18n = createI18n({
  legacy: false,
  locale: getBrowserLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export function setLocale(locale: string) {
  i18n.global.locale.value = locale as 'zh-CN' | 'en'
  localStorage.setItem('locale', locale)
  document.documentElement.lang = locale
}

export default i18n

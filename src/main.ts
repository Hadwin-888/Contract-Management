import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'

const app = createApp(App)
const clickOutsideHandlers = new WeakMap<HTMLElement, (event: MouseEvent) => void>()

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(i18n)

app.directive('click-outside', {
  mounted(el: HTMLElement, binding) {
    const handler = (event: MouseEvent) => {
      if (!el.contains(event.target as Node)) {
        binding.value?.(event)
      }
    }
    clickOutsideHandlers.set(el, handler)
    document.addEventListener('click', handler)
  },
  unmounted(el: HTMLElement) {
    const handler = clickOutsideHandlers.get(el)
    if (handler) {
      document.removeEventListener('click', handler)
      clickOutsideHandlers.delete(el)
    }
  },
})

app.mount('#app')

import { createApp } from 'vue'
import { createPinia } from 'pinia' // 1. Import Pinia
import App from './App.vue'
import router from './router'

import './assets/main.css' // (Optional, jika ada)

import vue3GoogleLogin from 'vue3-google-login'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 🔒 LOGIN GOOGLE 
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'

if (!(window as any).__GOOGLE_LOGIN_INITIALIZED__) {
  console.log('Initializing Google Login with ID:', googleClientId);
  app.use(vue3GoogleLogin, {
    clientId: googleClientId
  })
  ;(window as any).__GOOGLE_LOGIN_INITIALIZED__ = true
} else {
  app.use(vue3GoogleLogin, {
    clientId: googleClientId
  })
}

app.mount('#app')
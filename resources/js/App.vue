<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import { useSettingsStore } from './stores/settings'
import { useAuthStore } from './stores/auth'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()
let lastReset = 0
let timeout: any

const resetTimeout = () => {
  const now = Date.now()
  if (authStore.token && (now - lastReset < 30000)) return
  lastReset = now
  
  clearTimeout(timeout)
  if (authStore.token) {
    timeout = window.setTimeout(() => {
      authStore.logout()
      alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit.')
      router.push('/login')
    }, 30 * 60 * 1000)
  }
}

// Global Title Watcher
watch(
  () => [route.meta.title, settingsStore.settings.app_name],
  ([pageTitle, appName]) => {
    const finalTitle = pageTitle 
      ? `${pageTitle} - ${appName || 'SIGAP'}`
      : (appName || 'SIGAP')
    document.title = finalTitle
  },
  { immediate: true }
)

onMounted(() => {
  settingsStore.fetchSettings() // Load branding globally
  
  window.addEventListener('mousemove', resetTimeout)
  window.addEventListener('keydown', resetTimeout)
  window.addEventListener('click', resetTimeout)
  window.addEventListener('scroll', resetTimeout)
  resetTimeout()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', resetTimeout)
  window.removeEventListener('keydown', resetTimeout)
  window.removeEventListener('click', resetTimeout)
  window.removeEventListener('scroll', resetTimeout)
  clearTimeout(timeout)
})
</script>

<template>
  <RouterView />
</template>

<style>
/* Reset CSS sederhana */
body {
  margin: 0;
  font-family: sans-serif;
  background-color: #f0f2f5;
}
</style>
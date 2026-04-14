import { defineStore } from 'pinia'
import api from '../lib/axios'
import { API_BASE_URL } from '../lib/config'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      app_name: 'SIGAP',
      logo_url: '/favicon.ico',
      instansi_name: 'Portal Layanan',
      footer_copyright: '© 2026 SIGAP Team',
      footerLinks: [] as any[],
      _license: { status: 'VALID', host: '' } as { status: string, host: string }
    },
    isLoading: false
  }),
  actions: {
    async fetchSettings() {
      this.isLoading = true
      try {
        const { data } = await api.get('/settings')
        this.settings = { ...this.settings, ...data }
        this.updateBranding()
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        this.isLoading = false
      }
    },
    updateBranding() {
      // Logic for updating Favicon can also be here or in App.vue watcher
      if (this.settings.logo_url) {
        const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
        if (link) {
          link.href = this.settings.logo_url.startsWith('http') 
            ? this.settings.logo_url 
            : `${API_BASE_URL}${this.settings.logo_url}`
        }
      }
    }
  }
})

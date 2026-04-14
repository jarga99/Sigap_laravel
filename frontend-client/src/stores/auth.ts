import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'), // Ambil dari storage agar F5 tidak hilang
    token: localStorage.getItem('token') || '',
  }),
  actions: {
    async login(payload: any) {
      try {
        const response = await api.post('/auth/login', payload)
        const { token, user } = response.data
        this.token = token
        this.user = user
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        return true
      } catch (error) {
        console.error("Login Failed:", error)
        return false
      }
    },

    async loginWithGoogle(credential: string) {
      try {
        const response = await api.post('/auth/google', { credential })
        const { token, user } = response.data
        this.token = token
        this.user = user
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        return true
      } catch (error: any) {
        console.error("Google Login Failed:", error)
        throw error // Throw agar bisa ditangkap alert di LoginView
      }
    },

    // TAMBAHKAN FUNGSI INI agar AdminLayout.vue langsung tahu ada foto baru
    updateUser(userData: any) {
      this.user = { ...this.user, ...userData }
      localStorage.setItem('user', JSON.stringify(this.user))
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

})
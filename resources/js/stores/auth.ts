import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useAuthStore = defineStore('auth', {
  state: () => {
    let savedUser = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored && stored !== 'undefined') {
        savedUser = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Storage Error:", e);
    }

    return {
      user: savedUser,
      token: localStorage.getItem('token') || '',
      isVerified: false,
    }
  },
  actions: {
    async login(payload: any) {
      try {
        const response = await api.post('/auth/login', payload)
        const { token, user } = response.data
        this.token = token
        this.user = user
        this.isVerified = true
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        return true
      } catch (error: any) {
        console.error("🔥 [AUTH STORE]: Login Failed dengan payload:", payload);
        console.error("🔥 [AUTH STORE]: Error Server Detail:", error.response?.data || error.message);
        throw error;
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
      this.isVerified = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    async syncProfile() {
      if (!this.token) return false
      try {
        const res = await api.get('/users/profile')
        this.user = res.data.user
        this.isVerified = true
        localStorage.setItem('user', JSON.stringify(this.user))
        return true
      } catch (error: any) {
        console.error("🔥 [AUTH STORE]: syncProfile gagal mengambil data profil dari server!", error.response?.data || error.message);
        this.logout()
        return false
      }
    }
  }

})
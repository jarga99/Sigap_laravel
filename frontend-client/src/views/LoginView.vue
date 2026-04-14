<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../lib/axios'
import { 
  LogIn, ArrowLeft, Lock, User, AlertCircle, Eye, EyeOff 
} from 'lucide-vue-next'
import { GoogleLogin } from 'vue3-google-login'

import { useSettingsStore } from '../stores/settings'
import { API_BASE_URL } from '../lib/config'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const isLoading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false) // State password

const form = reactive({
  username: '', 
  password: ''
})

// --- LOGIKA BARU: TAHAN UNTUK MELIHAT ---
const startShow = () => {
  showPassword.value = true
}

const stopShow = () => {
  showPassword.value = false
}

// --- SETTINGS (LOGO) ---
const settings = computed(() => settingsStore.settings)
const API_URL = API_BASE_URL
// ----------------------------------------

const handleLogin = async () => {
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const success = await authStore.login(form)
    if (success) {
      router.push('/admin/dashboard')
    } else {
      errorMsg.value = 'Username atau password salah.'
    }
  } catch (err: any) {
    // Menangkap pesan error dari backend jika ada
    errorMsg.value = err.response?.data?.error || 'Terjadi kesalahan pada server.'
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSuccess = async (response: any) => {
  isLoading.value = true
  errorMsg.value = ''
  try {
    const success = await authStore.loginWithGoogle(response.credential)
    if (success) {
      router.push('/admin/dashboard')
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Gagal login via Google. Pastikan email Anda sudah terdaftar.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-abstract"></div>

    <!-- Removing back button as requested -->


    <div class="login-card animate-fadeup">
      <div class="card-header">
        <div class="logo-circle">
          <img 
            v-if="settings.logo_url" 
            :src="settings.logo_url.startsWith('http') ? settings.logo_url : API_URL + settings.logo_url" 
            alt="Logo" 
            class="logo-img" 
          />
          <div v-else class="logo-placeholder">
            <span class="text-blue-600 font-bold text-2xl">{{ settings.app_name?.charAt(0) || 'S' }}</span>
          </div>
        </div>
        <h2>Admin Portal</h2>
        <p>Masuk untuk mengelola {{ settings.instansi_name || 'layanan SIGAP' }}</p>
      </div>

      <div v-if="errorMsg" class="alert-box error">
        <AlertCircle :size="16" /> {{ errorMsg }}
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label>Username / Email</label>
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input 
              v-model="form.username" 
              type="text" 
              placeholder="Masukkan akun admin" 
              required
              autofocus
            />
          </div>
        </div>

        <div class="input-group">
          <label>Password</label>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              required
            />
            
            <button 
              type="button" 
              class="btn-eye"
              @mousedown="startShow"
              @mouseup="stopShow"
              @mouseleave="stopShow"
              @touchstart.prevent="startShow"
              @touchend.prevent="stopShow"
              tabindex="-1"
              title="Tahan klik untuk melihat password"
            >
              <Eye v-if="!showPassword" :size="18" />
              <EyeOff v-else :size="18" />
            </button>

          </div>
        </div>

        <button type="submit" :disabled="isLoading" class="btn-submit">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>Masuk Dashboard</span>
          <LogIn v-if="!isLoading" :size="18" />
        </button>

        <div class="separator-text">
           <span>Atau login dengan</span>
        </div>

        <div class="flex justify-center">
          <GoogleLogin :callback="handleGoogleSuccess" prompt auto-login />
        </div>
      </form>

      <!-- Removing footer return link as requested -->

    </div>

    <div class="footer-copy">
      <div class="mb-1">{{ settings.footer_copyright || `&copy; 2026 ${settings.app_name || 'SIGAP'} System. Secure Admin Access.` }}</div>
      <div class="opacity-60 text-[10px]">Sistem ini di desain dan di buat oleh : <strong>wiradika.jr</strong></div>
    </div>
  </div>
</template>

<style scoped>
/* Gunakan style CSS yang sudah ada di jawaban sebelumnya */
.login-page { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; font-family: 'Inter', sans-serif; color: #0f172a; background: #f8fafc; }
.bg-abstract { position: absolute; inset: 0; z-index: 0; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
.bg-abstract::before { content: ''; position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(0,0,0,0) 70%); border-radius: 50%; }
.bg-abstract::after { content: ''; position: absolute; bottom: -20%; left: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(96,165,250,0.1) 0%, rgba(0,0,0,0) 70%); border-radius: 50%; }
.back-btn-floating { position: absolute; top: 2rem; left: 2rem; z-index: 10; display: flex; align-items: center; gap: 8px; text-decoration: none; color: #64748b; font-weight: 600; font-size: 0.9rem; padding: 0.6rem 1rem; border-radius: 50px; background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.5); transition: all 0.2s; }
.back-btn-floating:hover { background: white; color: #2563eb; transform: translateX(-3px); }
.login-card { position: relative; z-index: 10; width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 24px; padding: 2.5rem; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05); }
.card-header { text-align: center; margin-bottom: 2rem; }
.logo-circle { width: 60px; height: 60px; background: white; border-radius: 16px; font-size: 1.8rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #f1f5f9; overflow: hidden; }
.logo-img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
.card-header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #1e293b; }
.card-header p { margin: 8px 0 0; color: #64748b; font-size: 0.9rem; }
.login-form { display: flex; flex-direction: column; gap: 1.2rem; }
.input-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
.input-wrapper { position: relative; display: flex; align-items: center; background: white; border: 1px solid #cbd5e1; border-radius: 10px; transition: all 0.2s; }
.input-wrapper:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.input-icon { margin-left: 12px; color: #94a3b8; }
.input-wrapper input { width: 100%; border: none; background: transparent; padding: 0.8rem; outline: none; font-size: 0.95rem; color: #1e293b; }
.btn-eye { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 0 12px; display: flex; align-items: center; transition: color 0.2s; outline: none; }
.btn-eye:hover { color: #2563eb; }
.btn-submit { width: 100%; padding: 0.9rem; margin-top: 0.5rem; background: #0f172a; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s; }
.btn-submit:hover { background: #2563eb; transform: translateY(-1px); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.separator-text {
  display: flex;
  align-items: center;
  text-align: center;
  color: #94a3b8;
  font-size: 0.75rem;
  margin: 0.5rem 0;
}
.separator-text::before, .separator-text::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #f1f5f9;
}
.separator-text:not(:empty)::before { margin-right: .5em; }
.separator-text:not(:empty)::after { margin-left: .5em; }

.alert-box { padding: 0.8rem; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; margin-bottom: 1.5rem; }
.alert-box.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.card-footer { text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
.link-muted { color: #94a3b8; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
.link-muted:hover { color: #2563eb; }
.footer-copy { position: absolute; bottom: 1.5rem; color: #cbd5e1; font-size: 0.75rem; }
.animate-fadeup { animation: fadeUp 0.6s ease-out forwards; opacity: 0; transform: translateY(20px); }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .back-btn-floating span { display: none; } .login-card { border-radius: 0; max-width: 100%; height: 100vh; display: flex; flex-direction: column; justify-content: center; } }
</style>
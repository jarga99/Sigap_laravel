<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { API_BASE_URL } from '../lib/config'
import SIGAPIcons from '../components/SIGAPIcons.vue'
import { GoogleLogin } from 'vue3-google-login'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

const settings = computed(() => settingsStore.settings)
const API_URL = API_BASE_URL
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'

const startShow = () => { showPassword.value = true }
const stopShow = () => { showPassword.value = false }

const handleLogin = async () => {
  if (!username.value || !password.value) return
  isLoading.value = true
  error.value = ''
  try {
    const success = await authStore.login({
      username: username.value,
      password: password.value
    })
    
    router.push('/')
    
  } catch (err: any) {
    console.error("💥 [UI] Login API Error:", err);
    const serverMessage = err.response?.data?.message || err.response?.data?.error;
    if (serverMessage) {
       error.value = `Gagal: ${serverMessage}`;
    } else {
       error.value = `Gagal: ${err.message}. Buka Console (F12) untuk melihat sumber masalah.`;
    }
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSuccess = async (response: any) => {
  isLoading.value = true
  error.value = ''
  try {
    const success = await authStore.loginWithGoogle(response.credential)
    if (success) {
      router.push('/')
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Gagal login via Google. Pastikan email Anda sudah terdaftar atau hubungi admin.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (authStore.token) router.push('/')
  document.documentElement.classList.remove('dark')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
     <div class="fixed inset-0 bg-blue-600/5 pointer-events-none"></div>
     
     <div class="w-full max-w-md bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl animate-fadeup relative z-10 text-center">
        <div class="w-20 h-20 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-100 flex items-center justify-center text-white mx-auto mb-8 border-4 border-white overflow-hidden relative">
           <img 
             v-if="settings.logo_url" 
             :src="settings.logo_url.startsWith('http') ? settings.logo_url : API_URL + settings.logo_url" 
             alt="Logo" 
             class="w-full h-full object-contain p-2 bg-white" 
           />
           <SIGAPIcons v-else name="User" :size="40" />
        </div>
        
        <h1 class="text-3xl font-black text-slate-800 tracking-tighter mb-2">Portal Pegawai</h1>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Sign in to manage your link ecosystem</p>

        <div v-if="error" class="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest leading-relaxed">
           {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
           <div class="space-y-1.5 text-left font-bold">
              <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Username / ID</label>
              <div class="relative group">
                 <SIGAPIcons name="User" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                    v-model="username" 
                    required 
                    type="text" 
                    placeholder="Masukkan username Anda..." 
                    class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all placeholder:font-semibold placeholder:text-slate-300 text-slate-700" 
                 />
              </div>
           </div>

           <div class="space-y-1.5 text-left font-bold">
              <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Password System</label>
              <div class="relative group">
                 <SIGAPIcons name="Lock" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                    v-model="password" 
                    required 
                    :type="showPassword ? 'text' : 'password'" 
                    placeholder="••••••••" 
                    class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold outline-none transition-all placeholder:font-semibold placeholder:text-slate-300 text-slate-700" 
                 />
                 <button 
                   type="button"
                   class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors focus:outline-none"
                   @mousedown="startShow"
                   @mouseup="stopShow"
                   @mouseleave="stopShow"
                   @touchstart.prevent="startShow"
                   @touchend.prevent="stopShow"
                   tabindex="-1"
                 >
                   <SIGAPIcons v-if="!showPassword" name="Eye" :size="18" />
                   <SIGAPIcons v-else name="EyeOff" :size="18" />
                 </button>
              </div>
           </div>

           <button :disabled="isLoading" class="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <SIGAPIcons v-if="!isLoading" name="LogIn" :size="20" />
              <div v-else class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ isLoading ? 'Otentikasi...' : 'Masuk ke Portal' }}
           </button>

           <div class="flex items-center gap-4 py-2">
              <div class="h-px bg-slate-100 flex-1"></div>
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">ATAU</span>
              <div class="h-px bg-slate-100 flex-1"></div>
           </div>

           <div class="flex justify-center w-full">
              <GoogleLogin :callback="handleGoogleSuccess" :clientId="googleClientId" prompt />
           </div>
        </form>
     </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
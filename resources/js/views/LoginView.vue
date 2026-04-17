<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SIGAPIcons from '../components/SIGAPIcons.vue'
import api from '../lib/axios'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) return
  isLoading.value = true
  error.value = ''
  try {
    const res = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    })
    authStore.setToken(res.data.token)
    authStore.setUser(res.data.user)
    router.push('/admin/dashboard')
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Login gagal. Cek kembali akun Anda.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (authStore.token) router.push('/admin/dashboard')
  document.documentElement.classList.remove('dark')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
     <div class="fixed inset-0 bg-blue-600/5 pointer-events-none"></div>
     
     <div class="w-full max-w-md bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl animate-fadeup relative z-10 text-center">
        <div class="w-20 h-20 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-100 flex items-center justify-center text-white mx-auto mb-8 border-4 border-white">
           <SIGAPIcons name="UserCircle" :size="40" />
        </div>
        
        <h1 class="text-3xl font-black text-slate-800 tracking-tighter mb-2">Portal Pegawai</h1>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Sign in to manage your link ecosystem</p>

        <div v-if="error" class="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest">
           {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
           <div class="space-y-1.5 text-left font-bold">
              <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Username / ID</label>
              <div class="relative">
                 <SIGAPIcons name="User" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 <input v-model="username" required type="text" placeholder="Masukkan username..." class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all" />
              </div>
           </div>

           <div class="space-y-1.5 text-left font-bold">
              <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Password System</label>
              <div class="relative">
                 <SIGAPIcons name="Lock" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 <input v-model="password" required type="password" placeholder="••••••••" class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all" />
              </div>
           </div>

           <button :disabled="isLoading" class="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              <SIGAPIcons v-if="!isLoading" name="LogIn" :size="20" />
              <div v-else class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ isLoading ? 'Otentiikasi...' : 'Masuk Dashboard' }}
           </button>
        </form>

        <div class="mt-12 pt-8 border-t border-slate-50">
           <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-all" @click="router.push('/')">Kembali ke Portal Publik</p>
        </div>
     </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
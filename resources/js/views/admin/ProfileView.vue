<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isLoading = ref(false)
const message = ref('')

const form = ref({
  fullName: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const fetchProfile = async () => {
  try {
    const res = await api.get('/auth/me')
    form.value.fullName = res.data.fullName
    form.value.username = res.data.username
  } catch (err) { console.error(err) }
}

const updateProfile = async () => {
  if (form.value.password && form.value.password !== form.value.confirmPassword) {
    alert('Konfirmasi password tidak cocok'); return
  }
  isLoading.value = true
  try {
    await api.put('/auth/profile', {
      fullName: form.value.fullName,
      password: form.value.password || undefined
    })
    message.value = 'Profil berhasil diperbarui!'
    setTimeout(() => message.value = '', 3000)
    authStore.fetchUser()
  } catch (err) { alert('Gagal memperbarui profil') }
  finally { isLoading.value = false }
}

onMounted(fetchProfile)
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8 animate-fadeup pb-20 pt-10 px-4">
    <div class="text-center space-y-2">
       <div class="w-24 h-24 bg-blue-600 shadow-xl shadow-blue-100 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6">
          <SIGAPIcons name="UserCircle" :size="48" />
       </div>
       <h1 class="text-3xl font-black text-slate-800 tracking-tight">Profil Pengguna</h1>
       <p class="text-sm text-slate-500 font-medium uppercase tracking-widest">Pengaturan Akun & Keamanan</p>
    </div>

    <div class="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
       <div v-if="message" class="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 text-xs font-black uppercase tracking-widest text-center animate-pulse">
          {{ message }}
       </div>

       <form @submit.prevent="updateProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap</label>
                <div class="relative">
                   <SIGAPIcons name="User" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input v-model="form.fullName" required class="w-full bg-slate-50 rounded-2xl p-4 pl-12 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
             </div>
             <div class="space-y-1.5 font-bold opacity-60 cursor-not-allowed">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Username (ID)</label>
                <div class="relative">
                   <SIGAPIcons name="Lock" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input v-model="form.username" disabled class="w-full bg-slate-100 rounded-2xl p-4 pl-12 text-sm font-bold border-none outline-none cursor-not-allowed" />
                </div>
             </div>
          </div>

          <div class="h-px bg-slate-50 my-4"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1 text-blue-600">Password Baru</label>
                <input v-model="form.password" type="password" placeholder="••••••••" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
             </div>
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1 text-blue-600">Konfirmasi Password</label>
                <input v-model="form.confirmPassword" type="password" placeholder="••••••••" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
             </div>
          </div>

          <p class="text-[10px] text-slate-400 font-bold italic text-center">* Kosongkan password jika tidak ingin mengganti password lama.</p>

          <button type="submit" :disabled="isLoading" class="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3">
             <SIGAPIcons v-if="!isLoading" name="Save" :size="20" />
             <span v-else class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
             {{ isLoading ? 'Menyimpan Perubahan...' : 'Simpan Pembaruan Profil' }}
          </button>
       </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

// State Form
const form = ref({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    oldPassword: '',
    subdivision: 'Memuat...',
    username: ''
})

// State untuk Gambar
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const fetchProfile = async () => {
    try {
        const res = await api.get('/auth/me')
        const user = res.data.user
        
        form.value.fullName = user.fullName || ''
        form.value.username = user.username || ''
        form.value.email = user.email || ''
        form.value.subdivision = user.category?.name || (user.role === 'ADMIN' ? 'Super Admin' : 'Umum')

        if (user.image_url) {
            previewImage.value = user.image_url
        }
        
        // Sync to AuthStore
        authStore.user = user
    } catch (err) { console.error(err) }
}

onMounted(fetchProfile)

const triggerFileInput = () => {
    fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
        const file = target.files[0]
        selectedFile.value = file
        const reader = new FileReader()
        reader.onload = (e) => {
            previewImage.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
}

const updateProfile = async () => {
    if (form.value.password && form.value.password !== form.value.confirmPassword) {
        isError.value = true
        message.value = 'Konfirmasi password tidak cocok'
        return
    }

    if (!form.value.oldPassword && (form.value.password || form.value.email !== authStore.user?.email)) {
        isError.value = true
        message.value = 'Password saat ini wajib diisi untuk simpan perubahan'
        return
    }

    isLoading.value = true
    message.value = ''
    isError.value = false

    try {
        const formData = new FormData()
        formData.append('fullName', form.value.fullName)
        formData.append('email', form.value.email)
        formData.append('oldPassword', form.value.oldPassword)
        
        if (form.value.password) {
            formData.append('password', form.value.password)
        }
        if (selectedFile.value) {
            formData.append('image', selectedFile.value)
        }

        const res = await api.post('/auth/profile-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })

        message.value = 'Profil berhasil diperbarui!'
        form.value.password = ''
        form.value.confirmPassword = ''
        form.value.oldPassword = ''
        selectedFile.value = null
        
        // Re-fetch to sync
        fetchProfile()
    } catch (err: any) {
        isError.value = true
        message.value = err.response?.data?.error || 'Gagal memperbarui profil'
    } finally {
        isLoading.value = false
        setTimeout(() => message.value = '', 5000)
    }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8 animate-fadeup pb-20 pt-10 px-4">
    <div class="text-center space-y-2">
       <div class="relative w-32 h-32 mx-auto mb-6 group">
          <div class="w-full h-full bg-slate-100 rounded-[2.5rem] border-4 border-white shadow-2xl shadow-blue-100 overflow-hidden">
             <img :src="previewImage || `https://ui-avatars.com/api/?name=${form.username}&background=eff6ff&color=3b82f6`" 
                  class="w-full h-full object-cover" />
          </div>
          <button @click="triggerFileInput" class="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 z-10">
             <SIGAPIcons name="Camera" :size="20" />
          </button>
          <input ref="fileInput" type="file" hidden @change="handleFileChange" accept="image/*" />
       </div>
       <h1 class="text-3xl font-bold text-slate-700 tracking-tight">Profil pengguna</h1>
       <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">{{ form.subdivision }}</p>
    </div>

    <div class="bg-blue-50/40 p-8 md:p-12 rounded-[3.5rem] border border-blue-100 shadow-sm space-y-8">
       <div v-if="message" :class="[isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100']" 
            class="p-4 rounded-2xl border text-xs font-bold text-center animate-pulse">
          {{ message }}
       </div>

       <form @submit.prevent="updateProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="space-y-1.5 font-semibold">
                <label class="text-[10px] text-slate-400 font-bold ml-1">Username (tetap)</label>
                <div class="relative">
                   <SIGAPIcons name="Shield" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200" />
                   <input v-model="form.username" disabled class="w-full bg-white/50 rounded-2xl p-4 pl-12 text-sm font-semibold border border-blue-50 outline-none cursor-not-allowed text-slate-400" />
                </div>
             </div>
             <div class="space-y-1.5 font-semibold">
                <label class="text-[10px] text-slate-400 font-bold ml-1">Kategori / unit</label>
                <div class="relative">
                   <SIGAPIcons name="Briefcase" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200" />
                   <input v-model="form.subdivision" disabled class="w-full bg-white/50 rounded-2xl p-4 pl-12 text-sm font-semibold border border-blue-50 outline-none cursor-not-allowed text-slate-400" />
                </div>
             </div>
             <div class="space-y-1.5 font-semibold md:col-span-2">
                <label class="text-[10px] text-slate-400 font-bold ml-1">Nama lengkap</label>
                <div class="relative">
                   <SIGAPIcons name="User" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200" />
                   <input v-model="form.fullName" required class="w-full bg-white rounded-2xl p-4 pl-12 text-sm font-bold text-slate-600 border border-blue-100/50 shadow-sm focus:border-indigo-500 outline-none transition-all" />
                </div>
             </div>
             <div class="space-y-1.5 font-bold md:col-span-2">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Email Resmi</label>
                <div class="relative">
                   <SIGAPIcons name="Mail" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input v-model="form.email" type="email" placeholder="email@instansi.go.id" class="w-full bg-slate-50 rounded-2xl p-4 pl-12 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
             </div>
          </div>

          <div class="border-t border-slate-50 pt-6 space-y-6">
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-red-500 tracking-widest ml-1 animate-bounce">Password Saat Ini (Wajib Konfirmasi)</label>
                <div class="relative">
                   <SIGAPIcons name="Lock" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-red-300" />
                   <input v-model="form.oldPassword" type="password" required placeholder="Masukkan password sekarang" class="w-full bg-red-50/30 rounded-2xl p-4 pl-12 text-sm font-bold border-2 border-red-100 focus:border-red-500 outline-none transition-all" />
                </div>
                <p class="text-[9px] text-slate-400 font-medium italic ml-1 mt-1">Dibutuhkan untuk memvalidasi setiap perubahan data atau password.</p>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Password Baru (Opsional)</label>
                   <input v-model="form.password" type="password" placeholder="••••••••" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Ulangi Password Baru</label>
                   <input v-model="form.confirmPassword" type="password" placeholder="••••••••" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
             </div>
          </div>

          <button type="submit" :disabled="isLoading" class="w-full py-5 bg-indigo-600 text-white rounded-[2.5rem] font-bold text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
             <SIGAPIcons v-if="!isLoading" name="Save" :size="20" />
             <span v-else class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
             {{ isLoading ? 'Sedang memproses...' : 'Simpan profil anda sekarang' }}
          </button>
       </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
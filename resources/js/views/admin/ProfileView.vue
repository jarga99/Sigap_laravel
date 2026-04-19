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
  <div class="space-y-8 animate-fadeup pb-20">
    <!-- Header Page -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-none">Profil Pengguna</h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
           Kelola informasi identitas dan keamanan akun anda
        </p>
      </div>
      <div class="flex items-center gap-3">
         <span class="px-4 py-2 bg-white border-2 border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm">
            Status: <span class="text-blue-500">Aktif</span>
         </span>
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4">
       <!-- LEFT: Summary Card -->
       <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
             <div class="relative w-32 h-32 mb-6 group">
                <div class="w-full h-full bg-slate-50 rounded-[2.5rem] border-4 border-white shadow-lg overflow-hidden transition-transform group-hover:scale-105">
                   <img :src="previewImage || `https://ui-avatars.com/api/?name=${form.username}&background=eff6ff&color=3b82f6`" 
                        class="w-full h-full object-cover" />
                </div>
                <button @click="triggerFileInput" class="absolute -bottom-1 -right-1 w-11 h-11 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 z-10 border-4 border-white">
                   <SIGAPIcons name="Camera" :size="18" />
                </button>
                <input ref="fileInput" type="file" hidden @change="handleFileChange" accept="image/*" />
             </div>
             
             <h2 class="text-xl font-black text-slate-800 leading-tight mb-1">{{ form.fullName || 'User SIGAP' }}</h2>
             <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">@{{ form.username }}</p>
             
             <div class="w-full pt-6 border-t border-slate-50 mt-4 space-y-4">
                <div class="flex flex-col items-center gap-1">
                   <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Unit Kerja</span>
                   <span class="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm w-full text-center">{{ form.subdivision }}</span>
                </div>
             </div>
          </div>
       </div>

       <!-- RIGHT: Form Card -->
       <div class="lg:col-span-3">
          <div class="bg-white p-10 rounded-[3rem] border-2 border-blue-50 shadow-xl shadow-slate-200/50 space-y-10">
             <div v-if="message" :class="[isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100']" 
                  class="p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-center animate-fadeup">
                {{ message }}
             </div>

             <form @submit.prevent="updateProfile" class="space-y-10">
                <!-- Section 1: Identitas -->
                <div class="space-y-6">
                   <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                         <SIGAPIcons name="User" :size="16" />
                      </div>
                      <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Informasi Dasar</h3>
                   </div>
                   
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                         <input v-model="form.fullName" required class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Resmi</label>
                         <input v-model="form.email" type="email" placeholder="official@mail.com" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all" />
                      </div>
                   </div>
                </div>

                <!-- Section 2: Keamanan -->
                <div class="space-y-6 pt-6 border-t border-slate-50">
                   <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600 text-xs">
                         <SIGAPIcons name="Lock" :size="16" />
                      </div>
                      <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Keamanan & Password</h3>
                   </div>

                   <div class="bg-red-50/30 p-6 rounded-2xl border border-red-100/50 space-y-4">
                      <label class="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                         Konfirmasi Password Saat Ini
                         <span class="bg-red-100 text-[8px] px-1.5 py-0.5 rounded uppercase leading-none">Wajib</span>
                      </label>
                      <input v-model="form.oldPassword" type="password" required placeholder="••••••••" class="w-full bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-red-100 focus:border-red-500 outline-none transition-all shadow-sm" />
                      <p class="text-[9px] text-slate-400 font-bold italic">Dibutuhkan untuk memverifikasi bahwa ini memang anda.</p>
                   </div>

                   <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru (Opsional)</label>
                         <input v-model="form.password" type="password" placeholder="Min. 8 karakter" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ulangi Password Baru</label>
                         <input v-model="form.confirmPassword" type="password" placeholder="Ketik ulang password baru" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all" />
                      </div>
                   </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-6">
                   <button type="submit" :disabled="isLoading" class="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                      <SIGAPIcons v-if="!isLoading" name="Save" :size="20" />
                      <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{{ isLoading ? 'Menyimpan...' : 'Simpan Profil Sekarang' }}</span>
                   </button>
                </div>
             </form>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
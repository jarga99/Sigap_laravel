<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const settings = ref<any>({})
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref('')

const fetchSettings = async () => {
  try {
    const res = await api.get('/admin/settings')
    settings.value = res.data
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const updateSettings = async () => {
  isSaving.value = true
  try {
    await api.put('/admin/settings', settings.value)
    message.value = 'Pengaturan berhasil disimpan!'
    setTimeout(() => message.value = '', 3000)
  } catch (err) { alert('Gagal menyimpan pengaturan') }
  finally { isSaving.value = false }
}

const handleFileUpload = async (event: Event, key: string) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'settings')
  try {
    const { data } = await api.post('/admin/upload', formData)
    settings.value[key] = data.url
  } catch (err) { alert('Upload gagal') }
}

onMounted(fetchSettings)
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20 max-w-5xl mx-auto">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Sistem</h1>
        <p class="text-sm text-slate-500 font-medium lowercase tracking-widest">Konfigurasi Identitas & Tampilan Global</p>
      </div>
      <button @click="updateSettings" :disabled="isSaving" class="px-8 py-4 bg-slate-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95">
         <SIGAPIcons v-if="!isSaving" name="Save" :size="18" />
         <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
         {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
      </button>
    </div>

    <div v-if="message" class="mx-4 bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 text-xs font-black uppercase tracking-widest text-center animate-pulse">
       {{ message }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
       <!-- Branding Section -->
       <div class="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <SIGAPIcons name="Building" :size="24" />
             </div>
             <h3 class="font-black text-slate-800 uppercase tracking-tighter">Identitas Instansi</h3>
          </div>

          <div class="space-y-6">
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Nama Instansi</label>
                <input v-model="settings.instansi_name" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
             </div>
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Nama Aplikasi</label>
                <input v-model="settings.app_name" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
             </div>
             <div class="space-y-4">
                <p class="text-[10px] uppercase text-slate-400 font-bold tracking-widest ml-1">Logo Utama</p>
                <div class="flex items-center gap-6">
                   <div class="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-3 relative group overflow-hidden">
                      <img v-if="settings.logo_url" :src="settings.logo_url" class="w-full h-full object-contain" />
                      <SIGAPIcons v-else name="ImageIcon" :size="32" class="text-slate-200" />
                      <button @click="$refs.lInput.click()" class="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <SIGAPIcons name="Upload" :size="20" />
                      </button>
                      <input type="file" ref="lInput" @change="handleFileUpload($event, 'logo_url')" hidden />
                   </div>
                   <p class="text-[10px] text-slate-400 font-medium italic">Gunakan format .png transparan untuk hasil terbaik.</p>
                </div>
             </div>
          </div>
       </div>

       <!-- Landing Page Config -->
       <div class="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <SIGAPIcons name="Layers" :size="24" />
             </div>
             <h3 class="font-black text-slate-800 uppercase tracking-tighter">Konfigurasi Landing</h3>
          </div>

          <div class="space-y-6">
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Judul Hero</label>
                <input v-model="settings.hero_title" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none transition-all" />
             </div>
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Sub-judul Hero</label>
                <textarea v-model="settings.hero_subtitle" rows="3" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none transition-all"></textarea>
             </div>
             <div class="space-y-1.5 font-bold">
                <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Pesan Footer Portal</label>
                <input v-model="settings.footer_text" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none transition-all" />
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
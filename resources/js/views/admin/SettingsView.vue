<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const settings = ref<any>({
    instansi_name: '',
    instansi_desc: '',
    app_name: 'SIGAP',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    footer_mode: 'COMPLEX',
    footer_text: '',
    footer_copyright: '',
    custom_domain: '',
    logo_url: null,
    bg_url: null
})

const footerLinks = ref<any[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref('')
const isError = ref(false)
const logStartDate = ref('')
const logEndDate = ref('')

// State for Footer Link Modal
const isLinkModalOpen = ref(false)
const isEditingLink = ref(false)
const linkForm = reactive({
    id: null,
    label: '',
    url: '',
    type: 'TEXT',
    order: 0,
    isActive: true,
    logo: null as File | null,
    logoUrl: null as string | null
})

const fetchSettings = async () => {
  try {
    const res = await api.get('/admin/settings')
    if (res.data) settings.value = { ...settings.value, ...res.data }
    
    // Fetch Footer Links
    const linksRes = await api.get('/admin/footer-links')
    footerLinks.value = linksRes.data
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

onMounted(fetchSettings)

// --- 💾 SAVE SETTINGS ---
const updateSettings = async () => {
  isSaving.value = true
  message.value = ''
  isError.value = false
  
  try {
    const formData = new FormData()
    Object.keys(settings.value).forEach(key => {
        if (!key.endsWith('_en') && settings.value[key] !== null && key !== 'logo_url' && key !== 'bg_url') {
            formData.append(key, settings.value[key])
        }
    })

    if (logoFile.value) formData.append('logo', logoFile.value)
    if (bgFile.value) formData.append('bg', bgFile.value)

    await api.post('/admin/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    message.value = 'Pengaturan sistem berhasil diperbarui!'
    fetchSettings()
  } catch (err) { 
    isError.value = true
    message.value = 'Gagal menyimpan pengaturan'
  } finally { 
    isSaving.value = false 
    setTimeout(() => message.value = '', 5000)
  }
}

// --- 📸 FILE HANDLING ---
const logoFile = ref<File | null>(null)
const bgFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const bgPreview = ref<string | null>(null)

const onFileChange = (e: Event, type: 'logo' | 'bg') => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (type === 'logo') {
        logoFile.value = file
        logoPreview.value = URL.createObjectURL(file)
    } else {
        bgFile.value = file
        bgPreview.value = URL.createObjectURL(file)
    }
}

// --- 🔗 FOOTER LINK CRUD ---
const openAddLink = () => {
    isEditingLink.value = false
    Object.assign(linkForm, { id: null, label: '', url: '', type: 'TEXT', order: 0, isActive: true, logo: null, logoUrl: null })
    isLinkModalOpen.value = true
}

const openEditLink = (link: any) => {
    isEditingLink.value = true
    Object.assign(linkForm, { ...link, logo: null })
    isLinkModalOpen.value = true
}

const saveLink = async () => {
    try {
        const formData = new FormData()
        formData.append('label', linkForm.label)
        formData.append('url', linkForm.url)
        formData.append('type', linkForm.type)
        formData.append('order', linkForm.order.toString())
        formData.append('isActive', linkForm.isActive.toString())
        if (linkForm.logo) formData.append('logo', linkForm.logo)

        if (isEditingLink.value) {
            await api.post(`/admin/footer-links/${linkForm.id}?_method=PUT`, formData)
        } else {
            await api.post('/admin/footer-links', formData)
        }
        
        isLinkModalOpen.value = false
        fetchSettings()
    } catch (err) { alert('Gagal menyimpan link') }
}

const deleteLink = async (id: number) => {
    if (!confirm('Hapus tautan ini?')) return
    try {
        await api.delete(`/admin/footer-links/${id}`)
        fetchSettings()
    } catch (err) { alert('Gagal menghapus') }
}

const toggleLinkActive = async (link: any) => {
    try {
        const formData = new FormData()
        formData.append('isActive', (!link.isActive).toString())
        formData.append('label', link.label)
        formData.append('url', link.url)
        formData.append('type', link.type)
        
        await api.post(`/admin/footer-links/${link.id}?_method=PUT`, formData)
        link.isActive = !link.isActive
    } catch (err) {
        alert('Gagal mengubah status')
    }
}

const downloadLogs = async (format: 'csv' | 'txt') => {
    message.value = 'Mempersiapkan file log...'
    isError.value = false
    try {
        const response = await api.post('/admin/audit-logs/export', {
            startDate: logStartDate.value,
            endDate: logEndDate.value,
            format: format
        }, { responseType: 'blob' })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        
        const contentDisposition = response.headers['content-disposition']
        let fileName = format === 'csv' ? `Activity_Report_${new Date().toISOString().split('T')[0]}.csv` : `Activity_Log_${new Date().toISOString().split('T')[0]}.txt`
        
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const parts = contentDisposition.split('filename=')
            if (parts.length > 1) fileName = parts[1].replace(/["']/g, '')
        }
        
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        message.value = `Log berhasil diunduh dalam format ${format.toUpperCase()}.`
    } catch (err) {
        isError.value = true
        message.value = 'Gagal mengunduh log aktivitas.'
    }
    setTimeout(() => message.value = '', 5000)
}

const downloadRawSystemLog = async () => {
    message.value = 'Mempersiapkan Log Sistem Laravel...'
    isError.value = false
    try {
        const response = await api.get('/admin/system/logs-raw', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        
        const contentDisposition = response.headers['content-disposition']
        let fileName = `laravel_system_${new Date().toISOString().split('T')[0]}.log`
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const parts = contentDisposition.split('filename=')
            if (parts.length > 1) fileName = parts[1].replace(/["']/g, '')
        }
        
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        message.value = 'Log sistem Laravel berhasil diunduh.'
    } catch (err) {
        isError.value = true
        message.value = 'Gagal mengunduh log sistem.'
    }
    setTimeout(() => message.value = '', 5000)
}


// --- 🛡️ SYSTEM MAINTENANCE (Restored: Blob download + 2-step reset) ---
const downloadBackup = async () => {
    message.value = 'Sedang menyiapkan file Backup MySQL...'
    isError.value = false
    try {
        const response = await api.get('/admin/system/backup', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        
        const contentDisposition = response.headers['content-disposition']
        let fileName = 'sigap_backup.sql'
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const parts = contentDisposition.split('filename=')
            if (parts.length > 1) fileName = parts[1].replace(/["']/g, '')
        }
        
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        message.value = 'Backup berhasil diunduh.'
    } catch (err) {
        isError.value = true
        message.value = 'Gagal men-generate backup MySQL.'
    }
    setTimeout(() => message.value = '', 5000)
}

const resetSystem = async () => {
    if (!confirm('⚠️ PERINGATAN KERAS!\n\nUntuk menghindari kehilangan data yang tidak disengaja, sistem akan membuat BACKUP SQL otomatis terlebih dahulu.\n\nKlik OK untuk memulai BACKUP lalu melanjutkan.')) return
    
    try {
        await downloadBackup()
        
        setTimeout(async () => {
            const confirmation = prompt('Backup telah dikirim ke browser.\nSilakan ketik "RESET" untuk menghapus semua data operasional secara permanen:')
            
            if (confirmation === 'RESET') {
                try {
                    const res = await api.post('/admin/system/reset')
                    message.value = res.data.message || 'Sistem berhasil direset.'
                    isError.value = false
                    setTimeout(() => window.location.reload(), 2000)
                } catch (err: any) {
                    isError.value = true
                    message.value = err.response?.data?.message || 'Gagal mereset sistem.'
                }
            } else {
                message.value = 'Reset dibatalkan.'
                isError.value = true
            }
        }, 1500)
    } catch (err) {
        isError.value = true
        message.value = 'Gagal melakukan backup wajib sebelum reset. Reset dihentikan.'
    }
}
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-none">Pengaturan Sistem</h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
           Kustomisasi identitas, visual, dan parameter teknis portal anda
        </p>
      </div>
      <div class="flex gap-4">
        <button @click="updateSettings" :disabled="isSaving" class="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-3">
           <SIGAPIcons v-if="!isSaving" name="Save" :size="18" />
           <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
           <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Message -->
    <Transition name="slide-down">
      <div v-if="message" :class="[isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100']" 
           class="mx-4 p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest text-center shadow-lg">
         {{ message }}
      </div>
    </Transition>

    <!-- Main Grid Layout -->
    <div class="px-4 space-y-8">
       <!-- ROW 1: Branding & Identity -->
       <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <!-- CARD 01: Visual & Branding -->
          <div class="bg-white p-10 rounded-[3rem] border-2 border-white shadow-xl shadow-slate-200/50 space-y-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-50 shadow-inner">01</div>
                <div>
                   <h3 class="font-black text-slate-800 text-sm uppercase tracking-widest">Visual & Branding</h3>
                   <p class="text-[9px] text-slate-400 font-bold italic">Atur tampilan utama portal anda</p>
                </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Logo -->
                <div class="space-y-3">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo Instansi</label>
                   <div class="relative aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden" @click="$refs.logoIn.click()">
                      <img v-if="logoPreview || settings.logo_url" :src="logoPreview || settings.logo_url" class="max-w-[70%] max-h-[70%] object-contain transition-transform group-hover:scale-110" />
                      <SIGAPIcons v-else name="Image" :size="32" class="text-slate-200" />
                      <div class="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-blue-600">
                         <SIGAPIcons name="Upload" :size="18" />
                         <span class="text-[8px] font-black uppercase mt-1">Ubah Logo</span>
                      </div>
                      <input type="file" ref="logoIn" hidden @change="onFileChange($event, 'logo')" accept="image/*" />
                   </div>
                </div>
                <!-- Wallpaper -->
                <div class="space-y-3">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wallpaper Portal</label>
                   <div class="relative aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden" @click="$refs.bgIn.click()">
                      <img v-if="bgPreview || settings.bg_url" :src="bgPreview || settings.bg_url" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <SIGAPIcons v-else name="Image" :size="32" class="text-slate-200" />
                      <div class="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white">
                         <SIGAPIcons name="Upload" :size="24" />
                         <span class="text-[8px] font-black uppercase mt-1">Ubah Wallpaper</span>
                      </div>
                      <input type="file" ref="bgIn" hidden @change="onFileChange($event, 'bg')" accept="image/*" />
                   </div>
                </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Domain</label>
                   <div class="bg-[#f4f8ff] rounded-2xl p-4 flex items-center gap-3">
                      <span class="text-xs font-bold text-slate-400">https://</span>
                      <input v-model="settings.custom_domain" placeholder="hub.go.id" class="bg-transparent flex-1 outline-none text-sm font-bold text-slate-700" />
                   </div>
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Aplikasi</label>
                   <input v-model="settings.app_name" placeholder="SIGAP Pasuruan" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all" />
                </div>
             </div>
          </div>

          <!-- CARD 02: Agency Info -->
          <div class="bg-blue-50/30 p-10 rounded-[3rem] border-2 border-white shadow-xl shadow-slate-200/50 space-y-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-50 shadow-inner">02</div>
                <div>
                   <h3 class="font-black text-slate-800 text-sm uppercase tracking-widest">Informasi Instansi</h3>
                   <p class="text-[9px] text-slate-400 font-bold italic">Legalitas dan data kontak resmi</p>
                </div>
             </div>

             <div class="space-y-6">
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap Instansi</label>
                   <input v-model="settings.instansi_name" placeholder="UPT BLK Pasuruan" class="w-full bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-slate-50 focus:border-blue-300 outline-none transition-all shadow-sm" />
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Kantor Pusat</label>
                   <textarea v-model="settings.contact_address" rows="2" class="w-full bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-slate-50 focus:border-blue-300 outline-none transition-all shadow-sm resize-none"></textarea>
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visi / Deskripsi Portal</label>
                   <textarea v-model="settings.instansi_desc" rows="3" class="w-full bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 border-2 border-slate-50 focus:border-blue-300 outline-none transition-all shadow-sm resize-none"></textarea>
                </div>
             </div>
          </div>
       </div>

       <!-- ROW 2: Maintenance & Links -->
       <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- CARD 03: Maintenance -->
          <div class="lg:col-span-2 bg-white p-10 rounded-[3rem] border-2 border-white shadow-xl shadow-slate-200/50 space-y-8">
             <div class="flex items-center justify-between border-b border-slate-50 pb-6">
                <div class="flex items-center gap-4">
                   <div class="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center font-black text-lg border border-white shadow-inner">03</div>
                   <div>
                      <h3 class="font-black text-slate-800 text-sm uppercase tracking-widest">Konfigurasi & Pemeliharaan</h3>
                   </div>
                </div>
                <div class="flex gap-2">
                   <button @click="downloadBackup" class="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 flex items-center gap-2">
                      <SIGAPIcons name="Database" :size="18" />
                      <span class="text-[9px] font-black uppercase tracking-widest">Backup SQL</span>
                   </button>
                   <button @click="resetSystem" class="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 flex items-center gap-2">
                      <SIGAPIcons name="RefreshCcw" :size="18" />
                      <span class="text-[9px] font-black uppercase tracking-widest">Reset System</span>
                   </button>
                </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <!-- Footer Config -->
                <div class="space-y-6">
                   <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode Footer</label>
                      <select v-model="settings.footer_mode" class="w-full bg-[#f4f8ff] rounded-2xl p-4 font-bold text-sm outline-none">
                         <option value="SIMPLE">Sederhana</option>
                         <option value="COMPLEX">Lengkap</option>
                      </select>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slogan / Tagline Portal</label>
                      <textarea v-model="settings.footer_text" rows="4" class="w-full bg-[#f4f8ff] rounded-2xl p-4 font-bold text-sm outline-none resize-none"></textarea>
                   </div>
                </div>

                <!-- Logs Export -->
                <div class="space-y-6 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-50">
                   <div class="flex items-center gap-3 mb-2">
                      <SIGAPIcons name="History" :size="16" class="text-blue-500" />
                      <span class="text-[10px] font-black uppercase text-slate-600 tracking-widest">Ekspor Aktivitas</span>
                   </div>
                   <div class="grid grid-cols-2 gap-4">
                      <input type="date" v-model="logStartDate" class="bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-bold outline-none" />
                      <input type="date" v-model="logEndDate" class="bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-bold outline-none" />
                   </div>
                   <div class="grid grid-cols-2 gap-3 pt-2">
                      <button @click="downloadLogs('csv')" class="py-3.5 bg-white border border-slate-200 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
                         <SIGAPIcons name="FileSpreadsheet" :size="14" />
                         CSV
                      </button>
                      <button @click="downloadLogs('txt')" class="py-3.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                         <SIGAPIcons name="FileText" :size="14" />
                         TXT
                      </button>
                   </div>
                   <button @click="downloadRawSystemLog" class="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all">
                      <SIGAPIcons name="Terminal" :size="16" />
                      Laravel System Log (Raw)
                   </button>
                </div>
             </div>
          </div>

          <!-- CARD 04: Footer Links -->
          <div class="lg:col-span-1 bg-blue-50/20 p-8 rounded-[3rem] border-2 border-white shadow-xl shadow-slate-200/50 flex flex-col h-full">
             <div class="flex items-center justify-between mb-8 border-b border-blue-50 pb-6">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center font-black text-md border border-blue-50">04</div>
                   <h3 class="font-black text-slate-800 text-[11px] uppercase tracking-widest leading-none">Tautan Cepat</h3>
                </div>
                <button @click="openAddLink" class="w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95">
                   <SIGAPIcons name="Plus" :size="20" />
                </button>
             </div>

             <div class="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                <div v-for="link in footerLinks" :key="link.id" class="p-4 bg-white rounded-2xl flex items-center justify-between group shadow-sm border border-slate-50">
                   <div class="flex items-center gap-3 max-w-[60%]">
                      <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                         <img v-if="link.logoUrl" :src="link.logoUrl" class="w-full h-full object-contain p-1" />
                         <SIGAPIcons v-else name="Link" :size="16" class="text-slate-300" />
                      </div>
                      <div class="truncate">
                         <p class="text-[11px] font-black text-slate-700 truncate leading-tight">{{ link.label }}</p>
                         <p class="text-[8px] font-bold text-slate-400 truncate mt-0.5 leading-none">{{ link.url }}</p>
                      </div>
                   </div>
                   <div class="flex gap-1.5 opacity-100 transition-all">
                      <button @click="openEditLink(link)" class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all">
                         <SIGAPIcons name="Edit2" :size="14" />
                      </button>
                      <button @click="deleteLink(link.id)" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">
                         <SIGAPIcons name="Trash2" :size="14" />
                      </button>
                   </div>
                </div>
                <div v-if="footerLinks.length === 0" class="py-12 text-center">
                   <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Belum ada tautan</p>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- MODAL: ADD/EDIT FOOTER LINK -->
    <Teleport to="body">
       <div v-if="isLinkModalOpen" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-10 animate-fadeup space-y-8">
               <div class="flex items-center justify-between">
                   <h2 class="text-xl font-black text-slate-800 uppercase tracking-tighter">{{ isEditingLink ? 'Edit Tautan' : 'Tautan Baru' }}</h2>
                   <button @click="isLinkModalOpen = false" class="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all">
                       <SIGAPIcons name="X" :size="24" />
                   </button>
               </div>

               <div class="space-y-6">
                  <div class="grid grid-cols-2 gap-6">
                      <div class="space-y-2">
                          <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Label Tautan</label>
                          <input v-model="linkForm.label" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all" />
                      </div>
                      <div class="space-y-2">
                          <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Tautan</label>
                          <select v-model="linkForm.type" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold border-2 border-transparent outline-none">
                              <option value="TEXT">Hanya Teks</option>
                              <option value="IMAGE">Ikon Brand</option>
                          </select>
                      </div>
                  </div>

                  <div class="space-y-2">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Link (URL)</label>
                      <input v-model="linkForm.url" class="w-full bg-[#f4f8ff] rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all" />
                  </div>

                  <div class="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-50 flex items-center gap-6">
                       <div class="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-blue-50">
                            <img v-if="linkForm.logoUrl" :src="linkForm.logoUrl" class="w-full h-full object-contain" />
                            <SIGAPIcons v-else name="Image" :size="20" class="text-slate-200" />
                       </div>
                       <div class="flex-1 space-y-2">
                          <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unggah Ikon Brand</label>
                          <input type="file" @change="(e) => linkForm.logo = (e.target as HTMLInputElement).files?.[0] || null" class="w-full text-[9px] font-black text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white cursor-pointer" />
                       </div>
                  </div>
               </div>

               <div class="flex items-center justify-between pt-4">
                  <div class="flex items-center gap-6">
                     <div class="space-y-2">
                        <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                        <button type="button" @click="linkForm.isActive = !linkForm.isActive" :class="linkForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'" class="w-12 h-6 rounded-full relative transition-all block">
                           <div :class="linkForm.isActive ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"></div>
                        </button>
                     </div>
                  </div>
                  <button @click="saveLink" class="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-800 transition-all active:scale-95">Simpan</button>
               </div>
           </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-20px); }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

.shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05); }
</style>

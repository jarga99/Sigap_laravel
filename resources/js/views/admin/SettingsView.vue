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
    // Filter out restricted keys and multi-language leftovers
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

// --- 🛡️ SYSTEM MAINTENANCE ---
const downloadBackup = () => {
    window.open('/admin/system/backup', '_blank')
}

const resetSystem = async () => {
    if (!confirm('⚠️ PERINGATAN KRITIS: Seluruh data operasional akan dihapus permanen. Lanjutkan?')) return
    try {
        const res = await api.post('/admin/system/reset')
        alert(res.data.message)
        location.reload()
    } catch (err) { alert('Gagal mereset sistem') }
}
</script>

<template>
  <div class="space-y-12 animate-fadeup pb-32 max-w-6xl mx-auto pt-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4">
      <div class="space-y-1">
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">Pengaturan Sistem</h1>
        <p class="text-sm text-slate-400 font-semibold tracking-tight">Kustomisasi identitas, visual, dan parameter teknis portal anda</p>
      </div>
      <div class="flex items-center gap-4">
        <button @click="updateSettings" :disabled="isSaving" class="group relative px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-bold text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center gap-3 active:scale-95 overflow-hidden">
             <div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
             <SIGAPIcons v-if="!isSaving" name="Save" :size="20" class="relative z-10" />
             <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"></span>
             <span class="relative z-10">{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Message -->
    <Transition name="slide-down">
      <div v-if="message" :class="[isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100']" 
           class="mx-4 p-5 rounded-[2rem] border-2 text-sm font-bold tracking-tight text-center shadow-sm">
         <div class="flex items-center justify-center gap-3">
            <SIGAPIcons :name="isError ? 'AlertCircle' : 'CheckCircle'" :size="20" />
            {{ message }}
         </div>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 px-4">
       <!-- LEFT: Branding & Identity -->
       <div class="lg:col-span-2 space-y-10">
          
          <!-- BRANDING SECTION (Soft Blue Card) -->
          <div class="bg-blue-50/40 p-10 rounded-[3rem] border border-blue-100 shadow-sm space-y-10">
             <div class="flex items-center gap-5 border-b border-blue-100/50 pb-6">
                <div class="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-100 shadow-inner">01</div>
                <div>
                   <h3 class="font-bold text-slate-800 text-2xl tracking-tight">Visual & Branding</h3>
                   <p class="text-xs text-slate-400 font-medium italic">Atur tampilan publik portal anda</p>
                </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <!-- Logo -->
                <div class="space-y-4">
                   <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Logo Instansi</label>
                   <div class="relative w-full aspect-video bg-white rounded-[2.5rem] border-2 border-dashed border-blue-200 flex items-center justify-center p-10 group overflow-hidden shadow-inner cursor-pointer" @click="$refs.logoIn.click()">
                      <img v-if="logoPreview || settings.logo_url" :src="logoPreview || settings.logo_url" class="max-w-full max-h-full object-contain transition-transform group-hover:scale-105" />
                      <SIGAPIcons v-else name="Image" :size="48" class="text-blue-100" />
                      <div class="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white gap-2">
                          <SIGAPIcons name="Upload" :size="32" />
                          <span class="text-[10px] font-black uppercase tracking-widest">Ganti Logo</span>
                      </div>
                      <input type="file" ref="logoIn" hidden @change="onFileChange($event, 'logo')" accept="image/*" />
                   </div>
                </div>
                <!-- Background -->
                <div class="space-y-4">
                   <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Wallpaper Portal</label>
                   <div class="relative w-full aspect-video bg-white rounded-[2.5rem] border-2 border-dashed border-blue-200 flex items-center justify-center group overflow-hidden shadow-inner cursor-pointer" @click="$refs.bgIn.click()">
                      <img v-if="bgPreview || settings.bg_url" :src="bgPreview || settings.bg_url" class="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <SIGAPIcons v-else name="Image" :size="48" class="text-blue-100" />
                      <div class="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white gap-2">
                          <SIGAPIcons name="Upload" :size="32" />
                          <span class="text-[10px] font-black uppercase tracking-widest">Ganti Wallpaper</span>
                      </div>
                      <input type="file" ref="bgIn" hidden @change="onFileChange($event, 'bg')" accept="image/*" />
                   </div>
                </div>

                <div class="space-y-3">
                    <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Custom Domain / Prefix Hub</label>
                    <div class="flex items-center gap-4 bg-white rounded-2xl p-5 border border-blue-100/50 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all">
                        <SIGAPIcons name="Globe" :size="18" class="text-slate-300" />
                        <span class="text-xs font-bold text-slate-400">https://</span>
                        <input v-model="settings.custom_domain" placeholder="s.instansi.go.id" class="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                    </div>
                </div>

                <div class="space-y-3">
                    <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Nama Aplikasi Portal</label>
                    <div class="flex items-center gap-4 bg-white rounded-2xl p-5 border border-blue-100/50 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all">
                        <SIGAPIcons name="Hash" :size="18" class="text-slate-300" />
                        <input v-model="settings.app_name" placeholder="SIGAP Pasuruan" class="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                    </div>
                </div>
             </div>
          </div>

          <!-- IDENTITY SECTION (Soft Blue Card) -->
          <div class="bg-blue-50/30 p-10 rounded-[3rem] border border-blue-100/50 shadow-sm space-y-10">
             <div class="flex items-center gap-5 border-b border-blue-100/50 pb-6">
                <div class="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-100 shadow-inner">02</div>
                <div>
                   <h3 class="font-bold text-slate-800 text-2xl tracking-tight">Informasi Instansi</h3>
                   <p class="text-xs text-slate-400 font-medium italic">Legalitas dan data kontak resmi</p>
                </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-3 md:col-span-2">
                    <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Nama Lengkap Instansi</label>
                    <input v-model="settings.instansi_name" placeholder="UPT Balai Latihan Kerja Pasuruan" class="w-full bg-white rounded-2xl p-5 border border-blue-100/50 focus:border-blue-400 outline-none transition-all text-sm font-bold text-slate-700 shadow-sm" />
                </div>
                
                <div class="space-y-3 md:col-span-2">
                    <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Alamat Kantor Pusat</label>
                    <textarea v-model="settings.contact_address" rows="2" placeholder="Jl. Raya Pasuruan No. 123..." class="w-full bg-white rounded-2xl p-5 border border-blue-100/50 focus:border-blue-400 outline-none transition-all text-sm font-bold text-slate-700 shadow-sm resize-none"></textarea>
                </div>

                <div class="space-y-3 md:col-span-2">
                    <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Deskripsi Portal SIGAP</label>
                    <textarea v-model="settings.instansi_desc" rows="4" placeholder="Portal layanan digital terintegrasi untuk memudahkan akses pegawai..." class="w-full bg-white rounded-2xl p-5 border border-blue-100/50 focus:border-blue-400 outline-none transition-all text-sm font-bold text-slate-700 shadow-sm resize-none"></textarea>
                </div>
             </div>
          </div>
       </div>

       <!-- RIGHT: Support & Maintenance -->
       <div class="space-y-10">
           <!-- CARD 03: KONFIGURASI SISTEM (FOOTER & MAINTENANCE) -->
           <div class="bg-blue-50/40 p-10 rounded-[3rem] border border-blue-100 shadow-sm space-y-10">
              <div class="flex items-center gap-4 border-b border-blue-100/50 pb-6">
                 <div class="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-100 shadow-inner">03</div>
                 <h3 class="font-bold text-slate-800 text-xl tracking-tight">Konfigurasi & Pemeliharaan</h3>
              </div>

              <!-- Footer Section -->
              <div class="space-y-6">
                 <div class="space-y-2">
                     <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Mode Tampilan Footer</label>
                     <select v-model="settings.footer_mode" class="w-full bg-white rounded-2xl p-5 font-bold text-sm border border-blue-50 outline-none appearance-none cursor-pointer shadow-sm">
                         <option value="SIMPLE">Sederhana (Copyright Saja)</option>
                         <option value="COMPLEX">Lengkap (Tautan & Informasi)</option>
                     </select>
                 </div>

                 <div class="space-y-2">
                     <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-2">Slogan / Tagline</label>
                     <textarea v-model="settings.footer_text" rows="3" placeholder="Melayani dengan hati dan teknologi..." class="w-full bg-white rounded-2xl p-5 font-bold text-sm border border-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm resize-none"></textarea>
                 </div>
              </div>

              <!-- Maintenance Section (Backup & Reset) -->
              <div class="space-y-6 pt-6 border-t border-blue-100/50">
                 <div class="space-y-4">
                    <div class="flex items-center gap-3">
                       <SIGAPIcons name="Database" :size="18" class="text-blue-600" />
                       <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest">Pencadangan Data (SQL)</label>
                    </div>
                    <button @click="downloadBackup" class="w-full py-4 bg-white border border-blue-100 text-blue-600 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                       <SIGAPIcons name="Download" :size="20" />
                       Unduh Cadangan SQL
                    </button>
                 </div>

                 <div class="space-y-4 pt-4">
                    <div class="flex items-center gap-3 text-red-600">
                       <SIGAPIcons name="ShieldAlert" :size="18" />
                       <label class="text-[10px] uppercase font-black tracking-widest">Zona Terlarang (Reset)</label>
                    </div>
                    <button @click="resetSystem" class="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3">
                        <SIGAPIcons name="RefreshCcw" :size="20" />
                        Atur Ulang Sistem
                    </button>
                 </div>
              </div>
           </div>

           <!-- CARD 04: TAUTAN CEPAT (FOOTER LINKS) -->
           <div class="bg-blue-50/20 p-10 rounded-[3rem] border border-blue-100 shadow-sm space-y-6">
               <div class="flex items-center justify-between border-b border-blue-100/50 pb-4">
                 <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-100 shadow-inner">04</div>
                    <h3 class="font-bold text-slate-800 text-xl tracking-tight">Tautan Cepat</h3>
                 </div>
                 <button @click="openAddLink" class="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all">
                     <SIGAPIcons name="Plus" :size="24" />
                 </button>
               </div>

               <div class="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                   <div v-for="link in footerLinks" :key="link.id" class="p-5 bg-white rounded-[1.5rem] flex items-center justify-between group shadow-sm border border-blue-50/50">
                       <div class="flex items-center gap-4">
                           <div class="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                               <img v-if="link.logoUrl" :src="link.logoUrl" class="w-full h-full object-contain" />
                               <SIGAPIcons v-else :name="link.type === 'IMAGE' ? 'Image' : 'Link'" :size="20" class="text-blue-300" />
                           </div>
                           <div class="max-w-[120px]">
                               <p class="text-sm font-bold text-slate-700 truncate leading-tight">{{ link.label }}</p>
                               <p class="text-[10px] text-slate-400 font-medium truncate italic">{{ link.url }}</p>
                           </div>
                       </div>
                       <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button @click="openEditLink(link)" class="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl">
                               <SIGAPIcons name="Edit2" :size="16" />
                           </button>
                           <button @click="deleteLink(link.id)" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl">
                               <SIGAPIcons name="Trash2" :size="16" />
                           </button>
                       </div>
                   </div>
                   <div v-if="footerLinks.length === 0" class="py-12 text-center text-slate-300">
                       <SIGAPIcons name="Inbox" :size="48" class="mx-auto mb-4 opacity-20" />
                       <p class="text-[10px] font-black uppercase tracking-widest">Belum Ada Tautan</p>
                   </div>
               </div>
           </div>
       </div>
    </div>

    <!-- MODAL: ADD/EDIT FOOTER LINK -->
    <Teleport to="body">
       <div v-if="isLinkModalOpen" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div class="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-12 animate-pop space-y-10">
               <div class="flex items-center justify-between">
                   <h2 class="text-3xl font-bold text-slate-800 tracking-tight">{{ isEditingLink ? 'Perbarui Tautan' : 'Tautan Cepat Baru' }}</h2>
                   <button @click="isLinkModalOpen = false" class="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                       <SIGAPIcons name="X" :size="28" />
                   </button>
               </div>

               <div class="grid grid-cols-2 gap-8">
                   <div class="space-y-3">
                       <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-1">Label Menu</label>
                       <input v-model="linkForm.label" placeholder="Contoh: Helpdesk" class="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold border-2 border-transparent focus:border-blue-400 focus:bg-white transition-all outline-none" />
                   </div>
                   <div class="space-y-3">
                       <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-1">Tipe Tautan</label>
                       <select v-model="linkForm.type" class="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold border-2 border-transparent outline-none appearance-none cursor-pointer">
                           <option value="TEXT">Teks Deskriptif</option>
                           <option value="IMAGE">Visual / Ikonik</option>
                       </select>
                   </div>
               </div>

               <div class="space-y-3">
                   <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest ml-1">Tautan Navigasi (URL)</label>
                   <input v-model="linkForm.url" placeholder="https://..." class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl p-5 text-sm font-bold outline-none transition-all shadow-inner" />
               </div>

               <div class="flex items-center gap-8 bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-50 shadow-inner">
                   <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center p-3 shadow-sm border border-blue-50">
                        <img v-if="linkForm.logoUrl" :src="linkForm.logoUrl" class="w-full h-full object-contain opacity-80" />
                        <SIGAPIcons v-else name="Image" :size="32" class="text-blue-100" />
                   </div>
                   <div class="flex-1 space-y-3">
                      <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest leading-none">Unggah Ikon Brand</label>
                      <input type="file" @change="(e) => linkForm.logo = (e.target as HTMLInputElement).files?.[0] || null" class="w-full text-[10px] font-black text-slate-500 uppercase file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white cursor-pointer" />
                   </div>
               </div>

               <div class="flex items-center justify-between px-2">
                   <div class="flex items-center gap-6">
                      <div class="space-y-2">
                         <label class="text-[10px] uppercase text-slate-400 font-black tracking-widest">Urutan</label>
                         <input v-model.number="linkForm.order" type="number" class="w-24 bg-slate-50 rounded-2xl p-4 text-center font-bold text-sm outline-none" />
                      </div>
                      <div class="flex justify-center items-center gap-4 pt-4">
                         <button type="button" @click="linkForm.isActive = !linkForm.isActive" :class="linkForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'" class="w-12 h-6 rounded-full relative transition-all">
                            <div :class="linkForm.isActive ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md"></div>
                         </button>
                         <span class="text-[10px] uppercase font-black text-slate-500 tracking-widest">Tampilkan</span>
                      </div>
                   </div>
                   <button @click="saveLink" class="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">Simpan Tautan</button>
               </div>
           </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

.animate-pop { animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-20px); }

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

.shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
}
</style>
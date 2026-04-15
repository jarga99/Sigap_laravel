<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import api from '../../lib/axios'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'
import {
  Save, Globe, Building2, Image as ImageIcon, AlertCircle, Upload,
  Monitor, Info, Heart, Mail, Phone, MapPin, Sparkles, ShieldAlert, DownloadCloud,
  Plus, Trash2, Edit, ExternalLink, Link as LinkIcon
} from 'lucide-vue-next'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const isLoading = ref(false)
const isSaving = ref(false)
const isGenerating = ref(false)
const message = ref({ text: '', type: 'success' })


// State Form
// State Form (Sudah dipangkas)
const form = reactive({
  instansi_name: '',
  instansi_name_en: '',
  instansi_desc: '',
  instansi_desc_en: '',
  logo_url: '',
  bg_url: '',
  custom_domain: '',
  
  // Field Baru
  app_name: 'SIGAP',
  footer_text: '',
  footer_text_en: '',
  footer_copyright: '',
  contact_address: '',
  contact_phone: '',
  contact_email: '',
  footer_mode: 'COMPLEX'
})

// State untuk file gambar fisik
const selectedLogo = ref<File | null>(null)
const selectedBg = ref<File | null>(null)

// --- FOOTER LINKS STATE ---
const footerLinks = ref<any[]>([])
const showLinkModal = ref(false)
const isEditingLink = ref(false)
const linkForm = reactive({
  id: null as number | null,
  label: '',
  url: '',
  type: 'TEXT',
  order: 0,
  logoUrl: ''
})
const selectedLinkFile = ref<File | null>(null)
const isSavingLink = ref(false)

// Pagination Footer Links
const currentPageLink = ref(1)
const pageSizeLink = ref(10)
const pageSizeOptions = [10, 20, 30, 40, 50, 75, 100]

const totalPagesLink = computed(() => Math.ceil(footerLinks.value.length / pageSizeLink.value) || 1)
const paginatedFooterLinks = computed(() => {
  const start = (currentPageLink.value - 1) * pageSizeLink.value
  return footerLinks.value.slice(start, start + pageSizeLink.value)
})


watch(pageSizeLink, () => {
  currentPageLink.value = 1
})


// Handler Upload Logo
const onLogoChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedLogo.value = file
    form.logo_url = URL.createObjectURL(file) // Tampilkan preview
  }
}

// Handler Upload Background
const onBgChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedBg.value = file
    form.bg_url = URL.createObjectURL(file) // Tampilkan preview
  }
}

// Load Settings
const loadSettings = async () => {
  isLoading.value = true
  try {
    await settingsStore.fetchSettings()
    Object.assign(form, settingsStore.settings)
    await loadFooterLinks() // Juga load link footer
  } catch (err) {
    console.error("Gagal load settings")
  } finally {
    isLoading.value = false
  }
}

const loadFooterLinks = async () => {
  try {
    const res = await api.get('/admin/footer-links', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    footerLinks.value = res.data
  } catch (err) {
    console.error("Gagal load footer links")
  }
}

// Handler Footer Links
const openAddLink = () => {
  isEditingLink.value = false
  Object.assign(linkForm, { id: null, label: '', url: '', type: 'TEXT', order: footerLinks.value.length, logoUrl: '' })
  selectedLinkFile.value = null
  showLinkModal.value = true
}

const openEditLink = (link: any) => {
  isEditingLink.value = true
  Object.assign(linkForm, { ...link })
  selectedLinkFile.value = null
  showLinkModal.value = true
}

const saveFooterLink = async () => {
  isSavingLink.value = true
  try {
    const formData = new FormData()
    formData.append('label', linkForm.label)
    formData.append('url', linkForm.url)
    formData.append('type', linkForm.type)
    formData.append('order', linkForm.order.toString())
    
    if (selectedLinkFile.value) {
      formData.append('logo', selectedLinkFile.value)
    } else if (linkForm.logoUrl) {
      formData.append('logoUrl', linkForm.logoUrl)
    }

    if (isEditingLink.value) {
      await api.put(`/admin/footer-links/${linkForm.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authStore.token}` }
      })
    } else {
      await api.post('/admin/footer-links', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authStore.token}` }
      })
    }

    showLinkModal.value = false
    await loadFooterLinks()
  } catch (err) {
    alert("Gagal menyimpan tautan footer")
  } finally {
    isSavingLink.value = false
  }
}

const deleteFooterLink = async (id: number) => {
  if (!confirm("Hapus tautan ini?")) return
  try {
    await api.delete(`/admin/footer-links/${id}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    await loadFooterLinks()
  } catch (err) {
    alert("Gagal menghapus tautan")
  }
}

const toggleLinkActive = async (link: any) => {
  try {
    const formData = new FormData()
    formData.append('isActive', (!link.isActive).toString())
    formData.append('label', link.label)
    formData.append('url', link.url)
    formData.append('type', link.type)
    
    await api.put(`/admin/footer-links/${link.id}`, formData, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    link.isActive = !link.isActive
  } catch (err) {
    alert("Gagal mengubah status")
  }
}

const onLinkFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedLinkFile.value = target.files[0]
  }
}

// Save Settings (Menggunakan FormData karena ada file)
const saveSettings = async () => {
  isSaving.value = true
  message.value.text = ''

  try {
    const formData = new FormData()

    // Masukkan semua data teks ke formData
    Object.keys(form).forEach(key => {
      const value = form[key as keyof typeof form]
      if (typeof value === 'string' && !value.startsWith('blob:')) {
        formData.append(key, value)
      }
    })

    // Masukkan file jika ada yang dipilih
    if (selectedLogo.value) formData.append('logo', selectedLogo.value)
    if (selectedBg.value) formData.append('bg', selectedBg.value)

    // Gunakan PUT dan header multipart/form-data beserta Token
    await api.put('/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authStore.token}` // <-- 3. Selipkan token di sini
      }
    })

    message.value = { text: 'Pengaturan berhasil disimpan!', type: 'success' }
    await settingsStore.fetchSettings() // Refresh global store
    Object.assign(form, settingsStore.settings) // Ambil data terbaru dari store ke form
  } catch (err: any) {
    message.value = {
      text: err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan pengaturan.',
      type: 'error'
    }
  } finally {
    isSaving.value = false
    setTimeout(() => message.value.text = '', 3000)
  }
}

const generateAiTagline = async () => {
  if (!form.app_name) {
    message.value = { text: 'Harap isi Nama Aplikasi terlebih dahulu.', type: 'error' }
    return
  }

  isGenerating.value = true
  try {
    const res = await api.post('/settings/ai/generate-tagline', { appName: form.app_name }, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    
    if (res.data.tagline) {
      form.footer_text = res.data.tagline
      message.value = { text: 'Tagline berhasil dihasilkan!', type: 'success' }
    } else {
      throw new Error("Gagal mendapatkan tagline")
    }
  } catch (err: any) {
    message.value = { text: 'Gagal menghubungi AI. Cek koneksi/API Key.', type: 'error' }
  } finally {
    isGenerating.value = false
    setTimeout(() => message.value.text = '', 3000)
  }
}

// Reset System
const handleReset = async () => {
  if (confirm('PERINGATAN KERAS!\n\nUntuk menghindari kehilangan data yang tidak disengaja, sistem akan membuat BACKUP SQL otomatis terlebih dahulu.\n\nKlik OK untuk memulai BACKUP lalu melanjutkan ke proses reset.')) {
    try {
      // 1. Jalankan Backup secara otomatis
      await handleBackup()
      
      // Beri sedikit jeda agar user sadar download sudah mulai
      message.value = { text: 'Backup dimulai. Menunggu konfirmasi akhir...', type: 'success' }
      
      // 2. Konfirmasi Akhir
      setTimeout(async () => {
        const confirmation = prompt('Backup telah dikirim ke browser.\nSilakan ketik "RESET" untuk menghapus semua data operasional secara permanen:');
        
        if (confirmation === 'RESET') {
          try {
            const res = await api.post('/admin/system/reset')
            message.value = { text: res.data.message || 'Sistem berhasil direset.', type: 'success' }
            setTimeout(() => window.location.reload(), 2000)
          } catch (err: any) {
            message.value = { text: err.response?.data?.message || 'Gagal mereset sistem.', type: 'error' }
          }
        } else {
          message.value = { text: 'Reset dibatalkan.', type: 'error' }
        }
      }, 1500)
      
    } catch (err) {
      message.value = { text: 'Gagal melakukan backup wajib sebelum reset. Reset dihentikan.', type: 'error' }
    }
  }
}

// Backup System
const handleBackup = async () => {
  try {
    message.value = { text: 'Sedang menyiapkan file Backup MySQL...', type: 'success' }
    const response = await api.get('/admin/system/backup', {
      responseType: 'blob' // Penting untuk file download
    });
    
    // Create download link element
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from headers if possible or use default
    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'sigap_backup.sql';
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const parts = contentDisposition.split('filename=');
      if (parts.length > 1) {
        fileName = parts[1].replace(/["']/g, ''); // bersihkan tanda kutip
      }
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    message.value = { text: 'Backup berhasil diunduh.', type: 'success' };
  } catch (err: any) {
    message.value = { text: 'Gagal men-generate backup MySQL.', type: 'error' }
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-view animate-fadeup">

    <header class="page-header">
      <div>
        <h1>Pengaturan Instansi</h1>
        <p class="subtitle">Kelola identitas, tampilan, dan domain aplikasi.</p>
      </div>
      <button @click="saveSettings" :disabled="isSaving" class="btn-primary">
        <Save :size="18" />
        {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
      </button>
    </header>

    <div v-if="message.text" :class="['alert-box', message.type]">
      <AlertCircle :size="18" /> {{ message.text }}
    </div>

    <div v-if="!isLoading" class="settings-container-stack">
      <!-- 1. IDENTITAS INSTANSI -->
      <div class="card card-stacked">
        <div class="card-header">
          <Building2 class="card-icon" :size="20" />
          <h3>Identitas Instansi</h3>
        </div>
        <div class="card-body">
          <div class="row-2">
            <div class="form-group">
              <label>Nama Instansi (ID)</label>
              <input v-model="form.instansi_name" type="text" placeholder="Dinas Kominfo" />
            </div>
            <div class="form-group">
              <label>Name (EN) 🤖</label>
              <input v-model="form.instansi_name_en" type="text" placeholder="Kosongkan untuk AI Auto-Translate..." />
            </div>
          </div>

          <div class="row-2">
            <div class="form-group">
              <label>Deskripsi (ID)</label>
              <textarea v-model="form.instansi_desc" rows="2" placeholder="Deskripsi singkat instansi..."></textarea>
            </div>
            <div class="form-group">
              <label>Description (EN) 🤖</label>
              <textarea v-model="form.instansi_desc_en" rows="2"
                placeholder="Kosongkan untuk AI Auto-Translate..."></textarea>
            </div>
          </div>

          <div class="divider">Info Kontak</div>

          <div class="form-group">
            <label>Alamat Lengkap</label>
            <textarea v-model="form.contact_address" rows="2" placeholder="Jl. Merdeka No. 1..."></textarea>
          </div>

          <div class="row-2">
            <div class="form-group">
              <label class="dark:text-slate-300">No. Telepon</label>
              <div class="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg px-3 overflow-hidden border border-slate-200 dark:border-slate-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all dark:text-slate-100">
                <Phone :size="16" class="text-slate-400" />
                <input v-model="form.contact_phone" type="text" class="flex-1 border-none bg-transparent dark:bg-transparent px-2 py-2 focus:outline-none placeholder-slate-400 m-0" placeholder="021-xxxx" />
              </div>
            </div>
            <div class="form-group">
              <label class="dark:text-slate-300">Email Resmi</label>
              <div class="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg px-3 overflow-hidden border border-slate-200 dark:border-slate-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all dark:text-slate-100">
                <Mail :size="16" class="text-slate-400" />
                <input v-model="form.contact_email" type="text" class="flex-1 border-none bg-transparent dark:bg-transparent px-2 py-2 focus:outline-none placeholder-slate-400 m-0" placeholder="admin@instansi.go.id" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. APLIKASI & FOOTER -->
      <div class="card card-stacked">
        <div class="card-header">
          <Monitor class="card-icon" :size="20" />
          <h3>Aplikasi & Footer</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Nama Aplikasi (Header & Judul)</label>
            <input v-model="form.app_name" type="text" placeholder="SIGAP" />
          </div>
          <div class="row-2">
            <div class="form-group">
              <div class="label-with-action">
                <label>Tagline / Teks Footer (ID)</label>
                <button @click="generateAiTagline" :disabled="isGenerating" class="btn-ai-magic">
                  <Sparkles :size="14" /> {{ isGenerating ? 'Generating...' : 'AI Suggest' }}
                </button>
              </div>
              <textarea v-model="form.footer_text" rows="2" placeholder="Informasi singkat di footer..."></textarea>
            </div>
            <div class="form-group">
              <div class="label-with-action">
                <label>Footer Tagline (EN) 🤖</label>
                <!-- Placeholder untuk menjaga tinggi yang sama dengan tombol AI -->
                <div class="action-placeholder"></div>
              </div>
              <textarea v-model="form.footer_text_en" rows="2"
                placeholder="Kosongkan untuk AI Auto-Translate..."></textarea>
            </div>
          </div>

          <div class="row-2">
            <div class="form-group">
              <label>Teks Hak Cipta (Copyright)</label>
              <input v-model="form.footer_copyright" type="text" placeholder="© 2026 Admin Portal" />
            </div>
            <div class="form-group">
              <label class="dark:text-slate-300">Developer Info</label>
              <div class="flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 p-4 rounded-xl shadow-sm dark:text-slate-200">
                <Heart :size="18" class="text-red-500" />
                <span>Sistem ini dirancang dan dibangun oleh : <strong>wiradika.jr</strong></span>
              </div>
            </div>
          </div>

          <div class="row-2">
            <div class="form-group">
              <label>Mode Tampilan Footer Portal</label>
              <select v-model="form.footer_mode" class="w-full border p-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="COMPLEX">Kompleks (Default - Grid Tautan)</option>
                <option value="SIMPLE">Sederhana (Minimalist)</option>
              </select>
              <small class="help-text">Mode sederhana hanya menampilkan Hak Cipta dan Info Developer.</small>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. MANAJEMEN TAUTAN CEPAT (FOOTER) -->
      <div class="card card-stacked">
        <div class="card-header justify-between">
          <div class="flex items-center gap-2">
            <LinkIcon class="card-icon" :size="20" />
            <h3>Manajemen Tautan Cepat (Footer)</h3>
          </div>
          <button @click="openAddLink" class="btn-primary text-xs py-1.5 px-3">
            <Plus :size="14" /> Tambah Tautan
          </button>
        </div>
        <div class="card-body">
          <p class="text-sm text-slate-500 mb-2">Tautan ini akan muncul di bagian footer portal publik.</p>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-800/50">
                  <th class="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">Label</th>
                  <th class="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">Tipe</th>
                  <th class="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">Urutan</th>
                  <th class="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th class="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                <tr v-for="link in paginatedFooterLinks" :key="link.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div v-if="link.type === 'IMAGE' && link.logoUrl" class="w-8 h-8 rounded border bg-white overflow-hidden p-1 flex-shrink-0">
                        <img :src="link.logoUrl" class="w-full h-full object-contain" />
                      </div>
                      <div v-else class="w-8 h-8 rounded border bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <LinkIcon :size="14" class="text-slate-400" />
                      </div>
                      <div>
                        <div class="font-bold text-slate-700 dark:text-slate-200">{{ link.label }}</div>
                        <div class="text-[10px] text-slate-400 truncate max-w-[200px]">{{ link.url }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="p-3">
                    <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', link.type === 'IMAGE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">
                      {{ link.type === 'IMAGE' ? 'Logo' : 'Teks' }}
                    </span>
                  </td>
                  <td class="p-3 font-mono text-sm">{{ link.order }}</td>
                  <td class="p-3">
                    <button @click="toggleLinkActive(link)" :class="['px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors', link.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">
                      {{ link.isActive ? 'Aktif' : 'Non-Aktif' }}
                    </button>
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex justify-end gap-2">
                      <button @click="openEditLink(link)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                        <Edit :size="16" />
                      </button>
                      <button @click="deleteFooterLink(link.id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus">
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="footerLinks.length === 0">
                  <td colspan="5" class="p-8 text-center text-slate-400 italic text-sm">Belum ada tautan cepat yang ditambahkan.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer Links -->
          <div v-if="totalPagesLink > 1 || footerLinks.length > 10" class="mt-4 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Show</span>
              <select v-model="pageSizeLink" class="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none">
                <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <div class="flex items-center gap-4">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Hal <span class="text-slate-700 dark:text-slate-200">{{ currentPageLink }}</span> / {{ totalPagesLink }}
              </span>
              
              <div class="flex items-center gap-1">
                <button 
                  @click="currentPageLink--" 
                  :disabled="currentPageLink === 1" 
                  class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold text-sm"
                >
                  &lsaquo;
                </button>
                <button 
                  @click="currentPageLink++" 
                  :disabled="currentPageLink >= totalPagesLink" 
                  class="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold text-sm"
                >
                  &rsaquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD GABUNGAN: CUSTOM DOMAIN & ASET VISUAL (FULL WIDTH) -->
    <div v-if="!isLoading" class="card highlight-card animate-fadeup" style="margin-top: 2rem;">
      <div class="card-header">
        <Globe class="card-icon" :size="20" />
        <h3>Branding & Domain Aplikasi</h3>
      </div>
      <div class="card-body">
        <!-- Custom Domain (Atas) -->
        <div class="form-group">
          <label>URL Shortener Domain (Slug URL)</label>
          <div class="input-prefix">
            <span>https://</span>
            <input v-model="form.custom_domain" type="text" placeholder="s.instansi.go.id" />
          </div>
          <small class="help-text">
            Masukkan domain khusus untuk pemendek tautan. Kosongkan untuk menggunakan domain default.
          </small>
        </div>

        <div class="divider">Aset Visual</div>

        <!-- Aset Visual (Bawah, Row Layout) -->
        <div class="row-2">
          <div class="form-group">
            <label class="dark:text-slate-300">Pilih/Upload Logo</label>
            <div class="flex flex-row items-stretch gap-2 w-full">
              <input v-model="form.logo_url" type="text" class="flex-1 min-w-0 bg-transparent dark:bg-transparent" placeholder="Masukkan link atau upload..." />
              <label class="bg-blue-600 text-white w-[46px] m-0 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-blue-700 shrink-0 border border-transparent" title="Upload Logo">
                <Upload :size="18" />
                <input type="file" hidden accept="image/*" @change="onLogoChange" />
              </label>
            </div>
            <div v-if="form.logo_url" class="preview-box">
              <img :src="form.logo_url" alt="Logo Preview" />
            </div>
          </div>

          <div class="form-group">
            <label class="dark:text-slate-300">Pilih/Upload Background</label>
            <div class="flex flex-row items-stretch gap-2 w-full">
              <input v-model="form.bg_url" type="text" class="flex-1 min-w-0 bg-transparent dark:bg-transparent" placeholder="Masukkan link atau upload..." />
              <label class="bg-blue-600 text-white w-[46px] m-0 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-blue-700 shrink-0 border border-transparent" title="Upload Background">
                <Upload :size="18" />
                <input type="file" hidden accept="image/*" @change="onBgChange" />
              </label>
            </div>
            <div v-if="form.bg_url" class="preview-box wide">
              <img :src="form.bg_url" alt="Bg Preview" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD ADMIN SYSTEM (Reset & Backup) - HANYA UNTUK SUPER ADMIN -->
    <div v-if="!isLoading && authStore.user?.role === 'ADMIN'" class="card danger-card animate-fadeup" style="margin-top: 2rem;">
      <div class="card-header" style="background-color: #fef2f2; border-bottom: 1px solid #fee2e2;">
        <ShieldAlert class="text-red-600" :size="20" />
        <h3 class="text-red-700">Manajemen Sistem Kritis</h3>
      </div>
      <div class="card-body">
        <p class="text-sm text-slate-600 mb-4">
          Gunakan fitur ini dengan sangat hati-hati. Fitur ini dirancang untuk memelihara kestabilan data secara menyeluruh.
        </p>

        <div class="row-2">
          <div style="border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            <DownloadCloud :size="32" class="text-blue-500 mb-2" />
            <h4 class="font-bold text-slate-800 text-lg mb-1">Generate Backup Data</h4>
            <p class="text-xs text-slate-500 mb-4">Buat salinan data <code>.sql</code> seluruh sistem (Export Database MySQL).</p>
            <button @click="handleBackup" type="button" class="btn-primary w-full" style="background-color: #2563eb !important;">
              <DownloadCloud :size="16" /> Unduh File SQL
            </button>
          </div>

          <div style="border: 1px solid #fee2e2; padding: 1.5rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #fffafa;">
            <ShieldAlert :size="32" class="text-red-500 mb-2" />
            <h4 class="font-bold text-red-700 text-lg mb-1">Reset All Data</h4>
            <p class="text-xs text-red-400 mb-4">Hapus semua records operasional kecuali akun 1 Super Admin utama.</p>
            <button @click="handleReset" type="button" class="btn-primary w-full" style="background-color: #dc2626 !important; border: none; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);">
              <AlertCircle :size="16" /> Jalankan Reset
            </button>
          </div>
        </div>
      </div>
    </div>


    </div>

    <!-- MODAL FOOTER LINK -->
    <Teleport to="body">
      <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
        <div class="modal-content animate-fadeup w-full max-w-md">
          <div class="modal-header">
            <h3>{{ isEditingLink ? 'Edit Tautan Footer' : 'Tambah Tautan Footer' }}</h3>
            <button @click="showLinkModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div class="form-group">
              <label>Label Tautan</label>
              <input v-model="linkForm.label" type="text" placeholder="Contoh: CSIRT Nasional" />
            </div>
            <div class="form-group">
              <label>URL Tujuan</label>
              <input v-model="linkForm.url" type="text" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label>Tipe Tampilan</label>
              <select v-model="linkForm.type" class="w-full border p-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="TEXT">Teks Saja</option>
                <option value="IMAGE">Logo / Gambar</option>
              </select>
            </div>
            
            <div v-if="linkForm.type === 'IMAGE'" class="form-group">
              <label>Logo (Gambar)</label>
              <div class="flex gap-2">
                <input type="file" accept="image/*" @change="onLinkFileChange" class="hidden" ref="linkFileInput" />
                <button @click="$refs.linkFileInput.click()" class="flex-1 border-2 border-dashed border-slate-200 rounded-lg p-3 text-sm text-slate-500 hover:border-blue-400 transition-all flex flex-col items-center gap-1">
                  <Upload :size="18" />
                  <span>{{ selectedLinkFile ? selectedLinkFile.name : 'Pilih Gambar Logo' }}</span>
                </button>
              </div>
              <div v-if="linkForm.logoUrl && !selectedLinkFile" class="mt-2 flex items-center gap-2">
                <img :src="linkForm.logoUrl" class="w-10 h-10 rounded border object-contain p-1" />
                <span class="text-[10px] text-slate-400">Gambar saat ini</span>
              </div>
            </div>

            <div class="form-group">
              <label>Urutan (Order)</label>
              <input v-model="linkForm.order" type="number" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showLinkModal = false" class="btn-cancel">Batal</button>
            <button @click="saveFooterLink" :disabled="isSavingLink" class="btn-primary">
              {{ isSavingLink ? 'Menyimpan...' : 'Simpan Tautan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<style scoped>
/* LAYOUT */
.settings-view {
  padding-top: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.subtitle {
  color: #64748b;
  margin-top: 4px;
  font-size: 0.95rem;
}

.settings-container-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card-stacked {
  width: 100%;
}

@media (max-width: 1024px) {
  .row-2 {
    grid-template-columns: 1fr !important;
    gap: 1.5rem;
  }
}

/* CARDS */
.card {
  background: var(--card-bg);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-header {
  padding: 1.2rem;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.card-icon {
  color: var(--primary);
}

.card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.highlight-card {
  border: 1px solid #bfdbfe;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

.highlight-card .card-header {
  background: #eff6ff;
}

/* FORMS */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  min-height: 28px; /* Menjaga tinggi agar sejajar bahkan tanpa tombol */
}

.action-placeholder {
  height: 24px;
}

.btn-ai-magic {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.btn-ai-magic:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
}

.btn-ai-magic:disabled {
  opacity: 0.6;
  cursor: wait;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--input-bg);
  color: var(--text-main);
  transition: border 0.2s;
  font-family: inherit;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.help-text {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

/* INPUT PREFIX (Custom Domain) */
.input-prefix {
  display: flex;
  align-items: center;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--input-bg);
}

.input-prefix span {
  background: var(--bg-main);
  padding: 0.7rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  border-right: 1px solid var(--card-border);
}

.input-prefix input {
  border: none;
  flex: 1;
  border-radius: 0;
}

.input-prefix input:focus {
  box-shadow: none;
}

.input-prefix:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.divider {
  margin: 1rem 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #f1f5f9;
}

.input-with-icon {
  display: flex !important;
  align-items: center;
  border-radius: 8px;
  padding: 0 1rem;
}

.input-with-icon svg {
  color: #94a3b8;
}

.input-with-icon input {
  border: none !important;
  width: 100%;
}
.input-with-icon input:focus {
  outline: none;
  box-shadow: none;
}

.dev-info-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
  color: #475569;
}

:global(.dark) .dev-info-box {
  background: #0f172a !important;
  border-color: #334155 !important;
  color: #94a3b8 !important;
}

/* --- TOMBOL SIMPAN --- */
.btn-primary {
  background-color: var(--primary, #2563eb) !important;
  color: #ffffff !important;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
}

.btn-primary:hover {
  background-color: #1d4ed8 !important;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* --- GABUNGAN INPUT TEXT DAN TOMBOL UPLOAD --- */
.input-with-upload {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}

.input-with-upload input[type="text"] {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.btn-upload {
  background-color: var(--primary, #2563eb);
  color: #ffffff;
  width: 46px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.btn-upload:hover {
  background-color: #1d4ed8;
  transform: scale(1.05);
}

/* ALERTS & PREVIEW */
.alert-box {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.alert-box.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.alert-box.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.preview-box {
  width: 100%;
  max-width: 100px;
  height: 80px;
  border: 1px dashed #cbd5e1;
  padding: 4px;
  border-radius: 8px;
  margin-top: 8px;
  background: white;
}

.preview-box.wide {
  max-width: 100%;
  height: 100px;
}

.preview-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.wide img {
  object-fit: cover;
}

/* DARK MODE - Proper selectors */
:global(.dark) .card {
  background: #1e293b !important;
  border-color: #334155 !important;
}

:global(.dark) .card-header {
  background: rgba(15, 23, 42, 0.5) !important;
  border-color: #334155 !important;
}

:global(.dark) .card-header h3 {
  color: #f1f5f9 !important;
}

:global(.dark) .card-icon {
  color: #818cf8 !important;
}

:global(.dark) input,
:global(.dark) textarea {
  background: #334155 !important;
  border-color: #475569 !important;
  color: #e2e8f0 !important;
}

:global(.dark) input.bg-transparent, :global(.dark) .dark\:bg-transparent {
  background: transparent !important;
}

:global(.dark) .input-prefix {
  background: #334155 !important;
  border-color: #475569 !important;
}

:global(.dark) .input-prefix span {
  background: #0f172a !important;
  border-right-color: #475569 !important;
  color: #94a3b8 !important;
}

:global(.dark) .highlight-card {
  border-color: #1e40af !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
}

:global(.dark) .highlight-card .card-header {
  background: rgba(30, 58, 138, 0.3) !important;
}

:global(.dark) .preview-box {
  border-color: var(--card-border) !important;
  background: var(--bg-main) !important;
}

:global(.dark) .alert-box.success {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #6ee7b7 !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

:global(.dark) .alert-box.error {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #fca5a5 !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

/* ANIMATION */
.animate-fadeup {
  animation: fadeUp 0.5s ease-out forwards;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- MODAL STYLES --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

:global(.dark) .modal-overlay {
  background: rgba(15, 23, 42, 0.7);
}

.modal-content {
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--card-border);
  max-height: 90vh;
  overflow-y: auto;
}

:global(.dark) .modal-content {
  background: #1e293b;
  border-color: #334155;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
}

.modal-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
}

:global(.dark) .modal-footer {
  background: rgba(0, 0, 0, 0.2);
}

.btn-cancel {
  padding: 0.7rem 1.2rem;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

:global(.dark) .btn-cancel {
  background: #334155;
  color: #94a3b8;
  border-color: #475569;
}

:global(.dark) .btn-cancel:hover {
  background: #475569;
}
</style>
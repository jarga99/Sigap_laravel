<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import { API_BASE_URL } from '../../lib/config'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'
import { downloadFile } from '../../lib/download'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'

const router = useRouter()
const links = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const copiedId = ref<number | null>(null)
const baseUrl = API_BASE_URL

const showModal = ref(false)
const showIconPicker = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isImporting = ref(false)
const editId = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// QR Code States
const showQrModal = ref(false)
const activeQrLink = ref<any>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

// Auth & Permissions
const userRole = ref('')
const userDeptId = ref<number | null>(null)

const checkUserAccess = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole.value = payload.role || 'GUEST'
      userDeptId.value = payload.category_id || null
    } catch (e) { console.error(e) }
  }
}

const canModify = (link: any) => {
  if (userRole.value === 'ADMIN') return true
  if (userRole.value === 'EMPLOYEE' && link.category_id === userDeptId.value) return true
  return false
}

// Form State
const form = ref({
  title: '',
  url: '',
  slug: '',
  category_id: '' as string | number,
  desc: '',
  icon: 'Link',
  visibility: 'INTERNAL',
  is_active: true
})

const fetchData = async () => {
  isLoading.value = true
  try {
    const [resLinks, resCats] = await Promise.all([api.get('/admin/links'), api.get('/categories')])
    links.value = resLinks.data
    // For regular users, only show their category in the dropdown
    if (userRole.value === 'EMPLOYEE' && userDeptId.value) {
      categories.value = resCats.data.filter((c: any) => Number(c.id) === Number(userDeptId.value))
    } else {
      categories.value = resCats.data
    }
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

// Auto Slug Logic
watch(() => form.value.title, (newVal) => {
  if (!isEditing.value) {
    form.value.slug = newVal.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }
})

const openModalCreate = () => {
  isEditing.value = false
  editId.value = null
  form.value = { title: '', url: '', slug: '', category_id: '', desc: '', icon: 'Link', visibility: 'INTERNAL', is_active: true }
  showModal.value = true
}

const openModalEdit = (link: any) => {
  isEditing.value = true
  editId.value = link.id
  form.value = { 
    title: link.title, 
    url: link.url, 
    slug: link.slug || '', 
    category_id: link.category_id, 
    desc: link.desc || '', 
    icon: link.icon || 'Link', 
    visibility: link.visibility || 'INTERNAL', 
    is_active: !!link.is_active 
  }
  showModal.value = true
}

const saveLink = async () => {
  if (!form.value.title || !form.value.url || !form.value.category_id) return alert('Mohon lengkapi data wajib.')
  isSaving.value = true
  try {
    if (isEditing.value && editId.value) await api.put(`/admin/links/${editId.value}`, form.value)
    else await api.post('/admin/links', form.value)
    showModal.value = false
    fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { isSaving.value = false }
}

const deleteLink = async (id: number) => {
  if (!confirm('Hapus tautan ini?')) return
  try {
    await api.delete(`/admin/links/${id}`)
    links.value = links.value.filter(l => l.id !== id)
  } catch (e) { alert('Gagal menghapus') }
}

const copyToClipboard = (slug: string, id: number) => {
  const fullUrl = `${window.location.origin}/s/${slug}`
  navigator.clipboard.writeText(fullUrl)
  copiedId.value = id
  setTimeout(() => copiedId.value = null, 2000)
}

const triggerImport = () => fileInput.value?.click()

const handleImport = async (e: any) => {
  const file = e.target.files[0]
  if (!file) return
  isImporting.value = true
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await api.post('/admin/links/bulk', fd)
    alert(`Berhasil mengimpor ${res.data.successCount} tautan baru!`)
    fetchData()
  } catch (err) { alert('Gagal mengimpor file.') }
  finally { isImporting.value = false; if (fileInput.value) fileInput.value.value = '' }
}

const openQrModal = (link: any) => {
  activeQrLink.value = link
  showQrModal.value = true
  setTimeout(generateQr, 100)
}

const generateQr = async () => {
  if (!activeQrLink.value || !qrCanvas.value) return
  try {
    const fullUrl = `${window.location.origin}/s/${activeQrLink.value.slug}`
    await QRCode.toCanvas(qrCanvas.value, fullUrl, { width: 300, margin: 2 })
  } catch (e) { console.error(e) }
}

const downloadQr = () => {
  if (!qrCanvas.value) return
  const a = document.createElement('a')
  a.download = `QR-${activeQrLink.value.slug}.png`
  a.href = qrCanvas.value.toDataURL()
  a.click()
}

const handleIconSelect = (icon: string) => {
  form.value.icon = icon
}

const exportCsv = () => {
  window.open('/admin/links/export', '_blank')
}

const downloadTemplate = () => {
  window.open('/admin/links/template', '_blank')
}

// Table logic
const currentPage = ref(1)
const pageSize = ref(10)

const processedLinks = computed(() => {
  let result = [...links.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l => 
      l.title.toLowerCase().includes(q) || 
      l.slug?.toLowerCase().includes(q) ||
      l.category?.name?.toLowerCase().includes(q)
    )
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return processedLinks.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.ceil(processedLinks.value.length / pageSize.value) || 1)

onMounted(() => {
  checkUserAccess()
  fetchData()
})
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">Manajemen Tautan</h1>
        <p class="text-sm text-slate-400 font-semibold flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
           Buat, kelola, dan pantau seluruh link akses layanan anda
        </p>
      </div>
      <div class="flex gap-4 w-full md:w-auto">
         <button @click="fetchData" class="group p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
           <SIGAPIcons name="RefreshCcw" :size="20" class="group-hover:rotate-180 transition-transform duration-500" />
         </button>
         <button @click="openModalCreate" class="flex-1 md:flex-none px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-wider">
           <SIGAPIcons name="Plus" :size="20" />
           <span>Tambah Tautan Baru</span>
         </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white/50 p-2 rounded-[2rem] border border-blue-50 shadow-inner flex flex-col lg:flex-row gap-4 items-center">
      <div class="relative flex-1 group">
        <SIGAPIcons name="Search" :size="20" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
        <input v-model="searchQuery" type="text" placeholder="Cari layanan, slug, atau kategory portal..." class="w-full bg-white border-none rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
      </div>
      <div class="flex gap-3 px-2">
         <input type="file" ref="fileInput" hidden @change="handleImport" accept=".csv" />
         <button @click="triggerImport" :disabled="isImporting" class="px-6 py-3 bg-white border border-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-3 shadow-sm">
           <SIGAPIcons v-if="!isImporting" name="Upload" :size="16" />
           <span v-else class="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
           {{ isImporting ? 'Mengimpor...' : 'Impor Bulk' }}
         </button>
         <select v-model="pageSize" class="bg-white border border-slate-100 rounded-xl px-6 py-3 text-[10px] font-black uppercase text-slate-500 outline-none shadow-sm focus:ring-2 focus:ring-blue-100">
           <option :value="10">10 Baris</option>
           <option :value="25">25 Baris</option>
           <option :value="50">50 Baris</option>
         </select>
         <button @click="downloadTemplate" class="px-6 py-3 bg-white border border-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
           <SIGAPIcons name="FileText" :size="16" /> Download Template
         </button>
         <button @click="exportCsv" class="px-8 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-3 shadow-lg shadow-slate-200">
           <SIGAPIcons name="Download" :size="16" /> Export CSV
         </button>
      </div>
    </div>

    <!-- Table Container -->
    <div class="bg-white rounded-[3rem] border border-blue-50 shadow-sm overflow-hidden text-slate-600 animate-fadeup">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-blue-50">
              <th class="px-8 py-6 text-center w-16">No</th>
              <th class="px-8 py-6">Layanan Digital</th>
              <th class="px-8 py-6">Unit / Kategori</th>
              <th class="px-8 py-6 text-center font-bold text-blue-500 bg-blue-50/20">Akses (Klik)</th>
              <th class="px-8 py-6 text-center">Status</th>
              <th class="px-8 py-6 text-right">Manajemen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
               <td colspan="6" class="px-8 py-10"><div class="h-4 bg-slate-100 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="(link, idx) in paginatedLinks" :key="link.id" class="group hover:bg-blue-50/20 transition-all duration-300">
              <td class="px-8 py-6 text-center text-xs font-bold text-slate-300">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td class="px-8 py-6">
                <div class="flex items-center gap-5">
                  <div class="w-14 h-14 bg-white border border-blue-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:-rotate-6 group-hover:scale-110 shadow-sm transition-all duration-500">
                    <SIGAPIcons :name="link.icon || 'Link'" :size="24" />
                  </div>
                  <div>
                    <div class="font-bold text-slate-800 text-base leading-tight">{{ link.title }}</div>
                    <div class="text-[11px] text-blue-500 font-bold tracking-tight opacity-60 mt-1 cursor-pointer flex items-center gap-1 group/slug" @click="copyToClipboard(link.slug, link.id)">
                       {{ baseUrl }}/s/{{ link.slug }}
                       <SIGAPIcons name="Copy" :size="10" class="opacity-0 group-hover/slug:opacity-100" />
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6">
                 <span class="text-[10px] font-black uppercase tracking-wider px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full border border-slate-100">{{ link.category?.name || 'Umum' }}</span>
              </td>
              <td class="px-8 py-6 text-center bg-blue-50/10 font-mono">
                 <div class="flex flex-col items-center">
                    <span class="text-xl font-black text-blue-600">{{ link.clicks || 0 }}</span>
                    <span class="text-[9px] font-black text-slate-300 uppercase">Kunjungan</span>
                 </div>
              </td>
              <td class="px-8 py-6 text-center">
                 <div class="flex flex-col items-center gap-2">
                    <span :class="link.is_active ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-200 text-slate-500 shadow-slate-100'" class="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg">
                      {{ link.is_active ? 'Beroperasi' : 'Non-Aktif' }}
                    </span>
                    <span class="text-[9px] font-bold text-slate-300 flex items-center gap-1">
                       <SIGAPIcons :name="link.visibility === 'INTERNAL' ? 'Lock' : 'Globe'" :size="10" />
                       {{ link.visibility === 'INTERNAL' ? 'Internal' : 'Semua Kejuruan' }}
                    </span>
                 </div>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                   <button @click="copyToClipboard(link.slug, link.id)" class="p-3 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <SIGAPIcons :name="copiedId === link.id ? 'Check' : 'Copy'" :size="18" />
                   </button>
                   <button @click="openQrModal(link)" class="p-3 rounded-xl bg-purple-50 text-purple-500 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                      <SIGAPIcons name="QrCode" :size="18" />
                   </button>
                   <button v-if="canModify(link)" @click="openModalEdit(link)" class="p-3 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-600 hover:text-white transition-all shadow-sm">
                      <SIGAPIcons name="Edit2" :size="18" />
                   </button>
                   <button v-if="canModify(link)" @click="deleteLink(link.id)" class="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <SIGAPIcons name="Trash2" :size="18" />
                   </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
         <div class="flex items-center gap-6">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Halaman <span class="text-slate-800">{{ currentPage }}</span> dari <span class="text-slate-800">{{ totalPages }}</span></p>
         </div>
         <div class="flex gap-4">
            <button @click="currentPage--" :disabled="currentPage === 1" class="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 disabled:opacity-30 hover:border-blue-400 transition-all active:scale-95 shadow-sm">Prev</button>
            <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 disabled:opacity-30 hover:border-blue-400 transition-all active:scale-95 shadow-sm">Next</button>
         </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-pop">
             <div class="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
                <div class="flex gap-6 items-center">
                   <!-- Icon Selector -->
                   <div 
                     class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-blue-100 transition-all group relative overflow-hidden shadow-inner" 
                     @click="showIconPicker = true"
                   >
                      <SIGAPIcons :name="form.icon" :size="40" />
                      <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center transition-all">
                         <SIGAPIcons name="Edit2" :size="16" class="opacity-0 group-hover:opacity-100 text-blue-600" />
                      </div>
                   </div>
                   <div>
                     <h3 class="font-bold text-slate-800 text-2xl tracking-tight mb-1">{{ isEditing ? 'Perbarui Layanan' : 'Registrasi Layanan' }}</h3>
                     <p class="text-sm text-slate-400 font-medium tracking-tight">Kelola tautan dan akses gerbang digital anda</p>
                   </div>
                </div>
                <button @click="showModal = false" class="text-slate-300 hover:text-slate-500 transition-colors">
                   <SIGAPIcons name="X" :size="24" />
                </button>
             </div>
             
             <form @submit.prevent="saveLink" class="p-10 pt-8 space-y-6">
                <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-2">
                     <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Nama Layanan</label>
                     <input v-model="form.title" type="text" required placeholder="Contoh: E-Presensi" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none" />
                  </div>
                  <div class="space-y-2">
                     <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Custom Slug (Opsional)</label>
                     <input v-model="form.slug" type="text" placeholder="presensi-kita" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none" />
                  </div>
                </div>

                <div class="space-y-2">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Tautan Tujuan (URL)</label>
                   <input v-model="form.url" type="url" required placeholder="https://..." class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none" />
                </div>

                <div class="space-y-2">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Deskripsi Layanan (Opsional)</label>
                   <textarea v-model="form.desc" placeholder="Jelaskan secara singkat kegunaan layanan ini..." rows="3" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none resize-none"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-6">
                   <div class="space-y-2">
                      <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Unit / Kategori</label>
                      <select v-model="form.category_id" required class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none">
                         <option value="" disabled>Pilih Unit Kerja</option>
                         <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                      </select>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black ml-1">Hak Akses Layanan</label>
                      <select v-model="form.visibility" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none">
                         <option value="INTERNAL">Seluruh Pegawai (Login)</option>
                         <option value="KATEGORI">Hanya Kategori Terkait</option>
                      </select>
                   </div>
                </div>

                <div class="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-blue-50 shadow-inner">
                   <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                         <SIGAPIcons name="Eye" :size="20" />
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-800">Tayangkan di Portal Utama</p>
                        <p class="text-[10px] text-slate-500 font-medium">Link akan segera aktif setelah disimpan.</p>
                      </div>
                   </div>
                   <button type="button" @click="form.is_active = !form.is_active" :class="form.is_active ? 'bg-blue-600' : 'bg-slate-300'" class="w-14 h-8 rounded-full relative transition-all duration-300">
                      <div :class="form.is_active ? 'translate-x-7' : 'translate-x-1'" class="absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md"></div>
                   </button>
                </div>

                <div class="flex gap-4 pt-6">
                   <button type="submit" :disabled="isSaving" class="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-sm tracking-wide shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                      <SIGAPIcons v-if="!isSaving" name="Save" :size="18" />
                      <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {{ isSaving ? 'Memproses...' : 'Simpan Perubahan' }}
                   </button>
                </div>
             </form>
          </div>
       </div>

       <!-- QR Modal -->
       <div v-if="showQrModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" @click="showQrModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl p-12 text-center animate-pop border border-white">
             <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <SIGAPIcons name="QrCode" :size="40" />
             </div>
             <h3 class="text-2xl font-bold text-slate-800 mb-2">QR Code Layanan</h3>
             <p class="text-sm text-slate-400 font-medium mb-10">Scan barcode di bawah untuk akses langsung</p>
             
             <div class="bg-blue-50/50 p-8 rounded-[2.5rem] inline-block mb-10 shadow-inner border border-blue-100 ring-8 ring-white">
                <canvas ref="qrCanvas" class="mx-auto rounded-2xl mix-blend-multiply"></canvas>
             </div>
             
             <div class="p-4 bg-slate-50 rounded-2xl mb-10 font-mono text-[10px] text-slate-400 break-all select-all">
                {{ baseUrl }}/s/{{ activeQrLink?.slug }}
             </div>

             <div class="flex gap-4">
                <button @click="downloadQr" class="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">Unduh QR Code</button>
                <button @click="showQrModal = false" class="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Tutup</button>
             </div>
          </div>
       </div>
    </Teleport>

    <!-- Icon Picker Overlay -->
    <IconSelectorModal 
      :isOpen="showIconPicker" 
      :currentIcon="form.icon" 
      @close="showIconPicker = false" 
      @select="handleIconSelect" 
    />
  </div>
</template>

<style scoped>
.animate-pop { animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
}
</style>
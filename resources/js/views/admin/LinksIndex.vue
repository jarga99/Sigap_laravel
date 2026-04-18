<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import { API_BASE_URL } from '../../lib/config'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'
import SIGAPSelect from '../../components/admin/SIGAPSelect.vue'
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
const settings = ref<any>({})

const slugBaseUrl = computed(() => {
  if (settings.value?.custom_domain) {
    return settings.value.custom_domain.replace(/\/$/, '')
  }
  return window.location.origin
})

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
const qrOptions = ref({
  color: '#1e293b',
  bgColor: '#ffffff',
  shape: 'square' as 'square' | 'circle',
  cornerShape: 'square' as 'square' | 'rounded',
  errorLevel: 'M' as 'L' | 'M' | 'Q' | 'H'
})

// Auth & Permissions
const userRole = ref('')
const userDeptId = ref<number | null>(null)

const checkUserAccess = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole.value = payload.role || 'GUEST'
      userDeptId.value = payload.category_id ? Number(payload.category_id) : null
    } catch (e) {
      console.error('JWT Parse Error:', e)
    }
  }
}

const canModify = (link: any) => {
  if (userRole.value === 'ADMIN') return true
  if (userRole.value === 'EMPLOYEE' && link.category_id === userDeptId.value) return true
  return false
}

const visibilityOptions = [
  { id: 'INTERNAL', name: '🌍 Publik (Internal)' },
  { id: 'KATEGORI', name: '🏢 Khusus Kategori' }
]

// Form State (Lite: tanpa title_en/desc_en)
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
    const [resLinks, resCats, resSettings] = await Promise.all([
      api.get('/admin/links'), 
      api.get('/categories'),
      api.get('/admin/settings')
    ])
    links.value = resLinks.data
    settings.value = resSettings.data
    if (userRole.value === 'EMPLOYEE' && userDeptId.value) {
      categories.value = resCats.data.filter((c: any) => Number(c.id) === Number(userDeptId.value))
    } else {
      categories.value = resCats.data
    }
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

// Auto Slug
watch(() => form.value.title, (newVal) => {
  if (!isEditing.value) {
    form.value.slug = newVal.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }
})

// Open Graph Preview (Lite — tetap berguna untuk validasi link)
const urlPreviewData = ref<any>(null)
const isLoadingPreview = ref(false)
let urlTimeout: number
watch(() => form.value.url, (newUrl) => {
  if (!newUrl || !newUrl.startsWith('http')) { urlPreviewData.value = null; return }
  clearTimeout(urlTimeout)
  urlTimeout = window.setTimeout(async () => {
    isLoadingPreview.value = true
    try {
      const res = await api.get(`/portal/preview?url=${encodeURIComponent(newUrl)}`)
      urlPreviewData.value = res.data
    } catch { urlPreviewData.value = { error: true } }
    finally { isLoadingPreview.value = false }
  }, 900)
})

const openModalCreate = () => {
  isEditing.value = false; editId.value = null
  form.value = { 
    title: '', 
    url: '', 
    slug: '', 
    category_id: userRole.value === 'EMPLOYEE' ? userDeptId.value : '', 
    desc: '', 
    icon: 'Link', 
    visibility: 'INTERNAL', 
    is_active: true 
  }
  urlPreviewData.value = null
  showModal.value = true
}

const openModalEdit = (link: any) => {
  isEditing.value = true; editId.value = link.id
  form.value = { title: link.title, url: link.url, slug: link.slug || '', category_id: link.category_id, desc: link.desc || '', icon: link.icon || 'Link', visibility: link.visibility || 'INTERNAL', is_active: !!link.is_active }
  urlPreviewData.value = null
  showModal.value = true
}

const saveLink = async () => {
  if (!form.value.title || !form.value.url || !form.value.category_id) return alert('Mohon lengkapi data wajib.')
  isSaving.value = true
  try {
    if (isEditing.value && editId.value) await api.put(`/admin/links/${editId.value}`, form.value)
    else await api.post('/admin/links', form.value)
    showModal.value = false; fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { isSaving.value = false }
}

const deleteLink = async (id: number) => {
  if (!confirm('Hapus tautan ini?')) return
  try { await api.delete(`/admin/links/${id}`); links.value = links.value.filter(l => l.id !== id) }
  catch { alert('Gagal menghapus') }
}

const copyToClipboard = (slug: string, id: number) => {
  navigator.clipboard.writeText(`${slugBaseUrl.value}/s/${slug}`)
  copiedId.value = id; setTimeout(() => copiedId.value = null, 2000)
}

// Bulk Import
const triggerImport = () => fileInput.value?.click()
const handleImport = async (e: any) => {
  const file = e.target.files[0]; if (!file) return
  isImporting.value = true
  const fd = new FormData(); fd.append('file', file)
  try {
    const res = await api.post('/admin/links/bulk', fd)
    alert(res.data.message || `Berhasil mengimpor!`); fetchData()
  } catch { alert('Gagal mengimpor file.') }
  finally { isImporting.value = false; if (fileInput.value) fileInput.value.value = '' }
}

// QR Code Engine (Custom Canvas)
const openQrModal = (link: any) => {
  activeQrLink.value = link; showQrModal.value = true; setTimeout(generateQr, 100)
}
const generateQr = async () => {
  if (!activeQrLink.value || !qrCanvas.value) return
  const fullUrl = `${slugBaseUrl.value}/s/${activeQrLink.value.slug}`
  const canvas = qrCanvas.value; const ctx = canvas.getContext('2d'); if (!ctx) return
  try {
    const qrData = QRCode.create(fullUrl, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
    const { modules } = qrData; const moduleCount = modules.size; const margin = 4; const size = 380
    const cellSize = size / (moduleCount + margin * 2)
    canvas.width = size; canvas.height = size
    ctx.fillStyle = qrOptions.value.bgColor; ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = qrOptions.value.color
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize; const y = (row + margin) * cellSize
          const isFinder = (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7)
          if (isFinder && qrOptions.value.cornerShape === 'rounded') {
            ctx.beginPath(); ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.25); ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
            ctx.beginPath(); ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, 0, Math.PI * 2); ctx.fill()
          } else { ctx.fillRect(x, y, cellSize, cellSize) }
        }
      }
    }
  } catch (err) { console.error(err) }
}
const downloadQr = () => {
  if (!qrCanvas.value || !activeQrLink.value) return
  const a = document.createElement('a'); a.download = `QR-${activeQrLink.value.slug}.png`
  a.href = qrCanvas.value.toDataURL('image/png'); a.click()
}
watch(qrOptions, generateQr, { deep: true })

const handleIconSelect = (icon: string) => { form.value.icon = icon }

// Export CSV (Client-side)
const showExportMenu = ref(false)
const escapeCsv = (val: any) => { const str = String(val ?? '').replace(/"/g, '""'); return `"${str}"` }
const handleExportExcel = () => {
  let csv = `LAPORAN REKAPITULASI TAUTAN LAYANAN - SIGAP\n\n`
  csv += ['No', 'Nama Layanan', 'Kategori', 'Pembuat', 'Visibilitas', 'Status', 'Tanggal Daftar', 'Klik'].map(escapeCsv).join(';') + '\n'
  processedLinks.value.forEach((link, i) => {
    const dateField = link.created_at || link.createdAt
    const tgl = dateField ? new Date(dateField).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'
    csv += [i + 1, link.title, link.category?.name || '-', link.user?.username || link.user?.fullName || 'Sistem', link.visibility === 'INTERNAL' ? 'Internal' : 'Kategori', link.is_active ? 'Aktif' : 'Draft', tgl, link.clicks || 0].map(escapeCsv).join(';') + '\n'
  })
  const fileName = `Rekap_Links_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile('\ufeff' + csv, fileName, 'text/csv;charset=utf-8;')
  showExportMenu.value = false
}
const handlePrintPDF = () => { showExportMenu.value = false; window.print() }
const downloadTemplate = async () => {
  try { await downloadFile('/admin/links/template', 'template_import_links.xlsx') }
  catch { alert('Gagal mendownload template.') }
}

// Filter & Sort
const filterMonth = ref('all')
const filterYear = ref('all')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = ref(10)
const yearsList = computed(() => { const c = new Date().getFullYear(); return [c - 1, c, c + 1] })
watch(pageSize, () => { currentPage.value = 1 })

const processedLinks = computed(() => {
  let r = [...links.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    r = r.filter(l => l.title?.toLowerCase().includes(q) || l.slug?.toLowerCase().includes(q) || l.category?.name?.toLowerCase().includes(q))
  }
  r = r.filter(l => {
    const d = l.created_at || l.createdAt; if (!d) return true
    const dt = new Date(d)
    const mOk = filterMonth.value === 'all' || (dt.getMonth() + 1).toString() === filterMonth.value
    const yOk = filterYear.value === 'all' || dt.getFullYear().toString() === filterYear.value
    return mOk && yOk
  })
  if (sortBy.value === 'a-z') r.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  else if (sortBy.value === 'z-a') r.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
  else if (sortBy.value === 'clicks') r.sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
  else r.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
  return r
})
const paginatedLinks = computed(() => processedLinks.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
const totalPages = computed(() => Math.ceil(processedLinks.value.length / pageSize.value) || 1)
watch([searchQuery, filterMonth, filterYear, sortBy], () => { currentPage.value = 1 })

onMounted(() => { checkUserAccess(); fetchData() })
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manajemen Tautan</h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Kelola seluruh link layanan digital instansi.</p>
      </div>
      <div class="flex gap-3">
        <button @click="fetchData" class="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-xl shadow-slate-200/50 active:scale-90">
          <SIGAPIcons name="RefreshCcw" :size="20" />
        </button>
        <button @click="openModalCreate" class="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95">
          <SIGAPIcons name="Plus" :size="18" />
          Tambah Tautan
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white rounded-[2rem] border-2 border-white shadow-xl shadow-slate-200/50 p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center relative z-20">
      <!-- Search -->
      <div class="relative flex-1">
        <SIGAPIcons name="Search" :size="18" class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input v-model="searchQuery" type="text" placeholder="Cari layanan, slug, atau kategori..."
          class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300" />
      </div>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2.5">
        <select v-model="filterMonth" class="bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3 text-[10px] font-black text-slate-600 outline-none focus:border-blue-100 transition-all uppercase tracking-widest cursor-pointer">
          <option value="all">Bulan</option>
          <option v-for="m in 12" :key="m" :value="m.toString()">{{ ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][m-1] }}</option>
        </select>
        <select v-model="filterYear" class="bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3 text-[10px] font-black text-slate-600 outline-none focus:border-blue-100 transition-all uppercase tracking-widest cursor-pointer">
          <option value="all">Tahun</option>
          <option v-for="y in yearsList" :key="y" :value="y.toString()">{{ y }}</option>
        </select>
        <select v-model="sortBy" class="bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3 text-[10px] font-black text-slate-600 outline-none focus:border-blue-100 transition-all uppercase tracking-widest cursor-pointer">
          <option value="newest">Terbaru</option>
          <option value="a-z">Atas → Bawah</option>
          <option value="z-a">Bawah → Atas</option>
          <option value="clicks">Terpopuler</option>
        </select>
        <input type="file" ref="fileInput" hidden @change="handleImport" accept=".csv,.xlsx" />
        <button @click="triggerImport" :disabled="isImporting" class="px-6 py-3 bg-slate-50 border-2 border-slate-100 text-blue-600 rounded-2xl text-[10px] font-black hover:bg-blue-50 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
          <SIGAPIcons v-if="!isImporting" name="Upload" :size="16" />
          <span v-else class="w-4 h-4 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin"></span>
          {{ isImporting ? 'Importing...' : 'Import' }}
        </button>
        <div class="relative group/export">
          <button @click="showExportMenu = !showExportMenu" class="px-6 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 uppercase tracking-widest shadow-xl shadow-slate-200">
            <SIGAPIcons name="Download" :size="16" /> Export <SIGAPIcons name="ChevronDown" :size="12" />
          </button>
          <Transition name="fade">
            <div v-if="showExportMenu" class="absolute right-0 top-full mt-3 w-56 bg-white rounded-[1.5rem] shadow-2xl border-2 border-slate-50 z-50 overflow-hidden animate-pop">
              <button @click="handleExportExcel" class="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center gap-4 transition-colors">
                <SIGAPIcons name="FileSpreadsheet" :size="20" class="text-emerald-500" />
                <div><p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Excel .csv</p><span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Raw Data Format</span></div>
              </button>
              <button @click="handlePrintPDF" class="w-full px-6 py-4 text-left hover:bg-red-50 flex items-center gap-4 transition-colors border-t border-slate-50">
                <SIGAPIcons name="Printer" :size="20" class="text-red-500" />
                <div><p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Cetak PDF</p><span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ready to print</span></div>
              </button>
            </div>
          </Transition>
        </div>
        <select v-model="pageSize" class="bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3 text-[10px] font-black text-slate-600 outline-none uppercase tracking-widest cursor-pointer">
          <option v-for="opt in [10, 25, 50]" :key="opt" :value="opt">{{ opt }} Baris</option>
        </select>
      </div>
    </div>

    <!-- Employee hint -->
    <div v-if="userRole === 'EMPLOYEE'" class="flex items-center gap-2.5 px-5 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold">
      <SIGAPIcons name="AlertCircle" :size="15" />
      Terkunci di departemen Anda. Hanya tautan kategori Anda yang ditampilkan.
    </div>

    <!-- Table -->
    <div class="bg-white rounded-[2.5rem] border-2 border-white shadow-xl shadow-slate-200/50 overflow-hidden relative z-10">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              <th class="px-8 py-6 text-center w-16 text-[9px]">No</th>
              <th class="px-6 py-6 font-black">Layanan</th>
              <th class="px-6 py-6 font-black">Kategori</th>
              <th class="px-6 py-6 font-black">Pembuat</th>
              <th class="px-6 py-6 text-center font-black">Klik</th>
              <th class="px-6 py-6 text-center font-black">Status</th>
              <th class="px-8 py-6 text-right font-black">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="isLoading" v-for="i in 4" :key="i" class="animate-pulse">
              <td colspan="7" class="px-8 py-8"><div class="h-4 bg-slate-50 rounded-full w-full"></div></td>
            </tr>
            <tr v-else-if="paginatedLinks.length === 0">
              <td colspan="7" class="px-8 py-24 text-center">
                <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <SIGAPIcons name="Inbox" :size="40" class="text-slate-200" />
                </div>
                <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Data belum tersedia</p>
              </td>
            </tr>
            <tr v-else v-for="(link, idx) in paginatedLinks" :key="link.id"
                class="group hover:bg-blue-50/40 transition-all duration-300">
              <td class="px-8 py-6 text-center text-[10px] font-black text-slate-300 group-hover:text-blue-400 transition-colors">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-5">
                  <div class="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 group-hover:scale-110 border-2 border-white shadow-sm transition-all duration-500 shrink-0">
                    <SIGAPIcons :name="link.icon || 'Link'" :size="24" />
                  </div>
                    <div>
                      <p class="font-black text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">{{ link.title }}</p>
                      <p class="text-[11px] text-slate-400 font-bold mt-1 cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1.5" @click="copyToClipboard(link.slug, link.id)">
                         <span class="opacity-60">{{ slugBaseUrl.includes('://') ? slugBaseUrl.split('://')[1] : slugBaseUrl }}/s/{{ link.slug }}</span>
                         <SIGAPIcons name="Copy" :size="10" class="opacity-40" />
                      </p>
                    </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-4 py-1.5 bg-slate-50 text-slate-500 border-2 border-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-tighter">{{ link.category?.name || 'Umum' }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <SIGAPIcons name="User" :size="14" class="text-slate-400" />
                  <span class="text-xs font-bold text-slate-600">{{ link.user?.username || link.user?.fullName || 'Sistem' }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <p class="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{{ link.clicks || 0 }}</p>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Klik</p>
              </td>
              <td class="px-6 py-4 text-center">
                <div class="flex flex-col items-center gap-2">
                  <span :class="link.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'"
                        class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm">
                    {{ link.is_active ? 'Aktif' : 'Draft' }}
                  </span>
                  <span class="text-[9px] font-black text-slate-300 flex items-center gap-1 uppercase tracking-tighter">
                    <SIGAPIcons :name="link.visibility === 'INTERNAL' ? 'Lock' : 'Globe'" :size="10" />
                    {{ link.visibility === 'INTERNAL' ? 'Internal' : 'Publik' }}
                  </span>
                </div>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex justify-end gap-2 border-l border-slate-100 pl-4">
                  <a :href="link.url" target="_blank" title="Buka Link" class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 flex items-center justify-center">
                    <SIGAPIcons name="ExternalLink" :size="16" />
                  </a>
                  <button @click="copyToClipboard(link.slug, link.id)" title="Salin URL" class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100 flex items-center justify-center">
                    <SIGAPIcons :name="copiedId === link.id ? 'Check' : 'Copy'" :size="16" />
                  </button>
                  <button @click="openQrModal(link)" title="QR Code" class="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition-all shadow-sm border border-violet-100 flex items-center justify-center">
                    <SIGAPIcons name="QrCode" :size="16" />
                  </button>
                  <button v-if="canModify(link)" @click="openModalEdit(link)" title="Edit" class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100 flex items-center justify-center">
                    <SIGAPIcons name="Edit2" :size="16" />
                  </button>
                  <button v-if="canModify(link)" @click="deleteLink(link.id)" title="Hapus" class="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 flex items-center justify-center">
                    <SIGAPIcons name="Trash2" :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-8 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Menampilkan <span class="text-slate-800">{{ paginatedLinks.length }}</span> dari <span class="text-slate-800">{{ processedLinks.length }}</span> data
        </p>
        <div class="flex items-center gap-3">
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 disabled:opacity-30 hover:border-blue-200 transition-all uppercase tracking-widest shadow-lg shadow-slate-200/50 active:scale-90">Prev</button>
          <div class="flex items-center gap-2">
             <span class="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-200">{{ currentPage }}</span>
             <span class="text-[10px] font-black text-slate-300">/ {{ totalPages }}</span>
          </div>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 disabled:opacity-30 hover:border-blue-200 transition-all uppercase tracking-widest shadow-lg shadow-slate-200/50 active:scale-90">Next</button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="showModal = false"></div>
        <div class="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-pop max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="px-8 py-7 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-5">
              <div class="relative group/icon-btn cursor-pointer" @click="showIconPicker = true">
                <div class="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center hover:ring-2 hover:ring-blue-100 transition-all shadow-md border-2 border-white relative z-10">
                  <SIGAPIcons :name="form.icon" :size="32" />
                </div>
                <!-- Patent Edit Indicator -->
                <div class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white z-20 group-hover/icon-btn:scale-110 transition-transform">
                  <SIGAPIcons name="Edit2" :size="12" />
                </div>
              </div>
              <div>
                <h3 class="font-black text-slate-800 text-xl tracking-tight leading-none mb-1.5">{{ isEditing ? 'Perbarui Tautan' : 'Tambah Tautan Baru' }}</h3>
                <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Konfigurasi landing page layanan</p>
              </div>
            </div>
            <button @click="showModal = false" class="text-slate-300 hover:text-slate-500 hover:bg-white p-2 rounded-xl transition-all">
              <SIGAPIcons name="X" :size="24" />
            </button>
          </div>

          <form @submit.prevent="saveLink" class="px-8 py-8 space-y-6 scrollbar-soft overflow-y-auto max-h-[60vh]">
            <div>
              <label class="label-soft">Nama Layanan *</label>
              <input v-model="form.title" type="text" required placeholder="Contoh: E-Presensi" class="input-soft" />
            </div>

            <div>
              <label class="label-soft">Tautan Tujuan (URL) *</label>
              <input v-model="form.url" type="url" required placeholder="https://..." class="input-soft" />
              <!-- Open Graph Preview -->
              <div v-if="isLoadingPreview" class="flex items-center gap-2 mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                <span class="w-3 h-3 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></span>
                Memuat preview...
              </div>
              <div v-else-if="urlPreviewData && !urlPreviewData.error" class="mt-4 flex gap-4 p-4 bg-slate-50 rounded-[1.5rem] border-2 border-white shadow-sm overflow-hidden animate-fadeup">
                <div class="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                  <img v-if="urlPreviewData.image" :src="urlPreviewData.image" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                  <p class="text-xs font-black text-slate-800 leading-tight truncate">{{ urlPreviewData.title }}</p>
                  <p class="text-[10px] text-slate-400 mt-1 font-bold line-clamp-2 leading-relaxed">{{ urlPreviewData.description }}</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="col-span-2 sm:col-span-1">
                <label class="label-soft">Custom Slug</label>
                <div class="input-soft !p-0 flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <span class="px-4 py-3 bg-slate-50 text-slate-300 border-r border-slate-100 whitespace-nowrap select-none font-bold text-[10px] uppercase tracking-tighter">
                    {{ settings.custom_domain ? 'DOMAIN' : 'URL' }} /s/
                  </span>
                  <input v-model="form.slug" type="text" 
                         class="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm font-bold text-slate-700 placeholder:text-slate-300" 
                         placeholder="e-presensi" />
                </div>
              </div>
              <div>
                <label class="label-soft">Unit / Kategori *</label>
                <SIGAPSelect v-model="form.category_id" :options="categories" placeholder="Pilih Unit Kerja" :disabled="userRole === 'EMPLOYEE'" />
              </div>
            </div>

            <div>
              <label class="label-soft">Deskripsi Singkat</label>
              <textarea v-model="form.desc" rows="3" placeholder="Jelaskan fungsi layanan ini..." class="input-soft resize-none"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="label-soft">Siapa yang bisa melihat?</label>
                <SIGAPSelect v-model="form.visibility" :options="visibilityOptions" />
              </div>
              <div class="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-white shadow-sm mt-1">
                <div>
                  <p class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Publikasi Layanan</p>
                  <p :class="form.is_active ? 'text-emerald-500' : 'text-slate-400'" class="text-[9px] font-bold uppercase tracking-widest mt-1">
                    {{ form.is_active ? 'Siap Tayang' : 'Simpan Draft' }}
                  </p>
                </div>
                <button type="button" @click="form.is_active = !form.is_active"
                  :class="form.is_active ? 'bg-blue-600' : 'bg-slate-300'"
                  class="w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner">
                  <div :class="form.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg"></div>
                </button>
              </div>
            </div>

            <div class="flex gap-4 pt-4">
              <button type="button" @click="showModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button type="submit" :disabled="isSaving" class="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-3 active:scale-95">
                <SIGAPIcons v-if="!isSaving" name="Save" :size="20" />
                <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Tautan' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- QR Modal (Advanced Canvas) -->
      <div v-if="showQrModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-lg" @click="showQrModal = false"></div>
        <div class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-pop max-h-[90vh] overflow-y-auto scrollbar-soft">
          <div class="px-8 py-5 border-b border-slate-100 bg-[#f4f8ff] flex items-center justify-between">
            <div>
              <h3 class="font-black text-slate-800">QR Code Layanan</h3>
              <p class="text-[11px] text-slate-400 font-medium">Scan untuk akses langsung</p>
            </div>
            <button @click="showQrModal = false" class="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
              <SIGAPIcons name="X" :size="18" />
            </button>
          </div>
          <div class="px-8 py-6 space-y-5">
            <!-- Canvas Preview -->
            <div class="flex justify-center p-6 bg-[#f4f8ff] rounded-xl border border-blue-100">
              <canvas ref="qrCanvas" class="rounded-xl"></canvas>
            </div>

            <!-- Customization -->
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label-soft block mb-1.5">Warna QR</label>
                <div class="flex items-center gap-2 bg-[#f4f8ff] rounded-xl p-3 border border-slate-100">
                  <input type="color" v-model="qrOptions.color" class="w-8 h-8 rounded-lg border-none cursor-pointer" />
                  <span class="text-[10px] font-mono text-slate-400">{{ qrOptions.color }}</span>
                </div>
              </div>
              <div><label class="label-soft block mb-1.5">Warna Latar</label>
                <div class="flex items-center gap-2 bg-[#f4f8ff] rounded-xl p-3 border border-slate-100">
                  <input type="color" v-model="qrOptions.bgColor" class="w-8 h-8 rounded-lg border-none cursor-pointer" />
                  <span class="text-[10px] font-mono text-slate-400">{{ qrOptions.bgColor }}</span>
                </div>
              </div>
              <div><label class="label-soft block mb-1.5">Bentuk Modul</label>
                <select v-model="qrOptions.shape" class="input-soft text-xs py-2.5">
                  <option value="square">■ Kotak</option>
                  <option value="circle">● Bulat</option>
                </select>
              </div>
              <div><label class="label-soft block mb-1.5">Sudut Finder</label>
                <select v-model="qrOptions.cornerShape" class="input-soft text-xs py-2.5">
                  <option value="square">Tajam</option>
                  <option value="rounded">Melengkung</option>
                </select>
              </div>
            </div>

            <div class="p-3.5 bg-[#f4f8ff] rounded-xl font-mono text-[10px] text-slate-400 break-all text-center border border-slate-100">
              /s/{{ activeQrLink?.slug }}
            </div>
            <div class="flex gap-3">
              <button @click="downloadQr" class="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-md flex items-center justify-center gap-2 transition-all">
                <SIGAPIcons name="Download" :size="15" /> Unduh QR
              </button>
              <button @click="showQrModal = false" class="px-6 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-all">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Icon Picker -->
    <IconSelectorModal :isOpen="showIconPicker" :currentIcon="form.icon" @close="showIconPicker = false" @select="handleIconSelect" />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
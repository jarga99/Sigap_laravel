<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import { API_BASE_URL } from '../../lib/config'
import * as LucideIcons from 'lucide-vue-next'
import {
  Plus, Search, Edit2, Trash2, ExternalLink, Copy, Check,
  X, Save, Loader2, Globe, Lock, Building, QrCode, Download, Upload,
  Printer, FileSpreadsheet, ChevronDown,
  Briefcase, Activity, Archive, Book, Heart, Star, Video, Image as ImageIcon, FolderOpen
} from 'lucide-vue-next'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'

const showIconModal = ref(false)

const iconMap: Record<string, any> = {
  FolderOpen, Briefcase, Globe, Activity, Archive, Book, Heart, Star, Video, ImageIcon
}
const availableIcons = Object.keys(iconMap)
import { useRouter } from 'vue-router'

const router = useRouter()
const links = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const copiedId = ref<number | null>(null)
// Ganti origin ke port 3000 agar Copy HTTP merujuk pada backend secara eksplisit.
const baseUrl = API_BASE_URL

const showModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editId = ref<number | null>(null)
import QRCode from 'qrcode'

// QR Code States
const showQrModal = ref(false)
const activeQrLink = ref<any>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square', // square, circle
  cornerShape: 'square', // square, rounded
  errorLevel: 'M' // L, M, Q, H
})

// State untuk menyimpan data user yang sedang login
const userRole = ref('')
const userDeptId = ref<number | null>(null) // <-- Ganti nama biar jelas

// Fungsi mengekstrak token JWT
const checkUserAccess = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole.value = payload.role || 'GUEST'

      // PERBAIKAN DI SINI: Tangkap 'departmentId' dari payload login
      userDeptId.value = payload.departmentId || null
    } catch (error) {
      console.error('Gagal decode token:', error)
    }
  }
}

// Fungsi penentu hak akses Edit & Delete
const canModify = (link: any) => {
  if (userRole.value === 'ADMIN') return true;

  // Jika Employee, cek apakah category_id link SAMA DENGAN departmentId employee
  if (userRole.value === 'EMPLOYEE' && link.category_id === userDeptId.value) return true;

  return false;
}

onMounted(() => {
  checkUserAccess()
  fetchData()
})

// --- FORM STATE ---
const form = ref({
  title: '',
  title_en: '',
  url: '',
  slug: '',
  category_id: '' as string | number,
  desc: '',
  desc_en: '',
  icon: '',
  visibility: 'INTERNAL',
  is_active: true
})

const fetchData = async () => {
  isLoading.value = true
  try {
    const [resLinks, resCats] = await Promise.all([
      api.get('/admin/links'),
      api.get('/categories')
    ])
    links.value = resLinks.data
    
    // RBAC FILTER: Pegawai hanya boleh melihat kategori departemennya
    if (userRole.value === 'EMPLOYEE' && userDeptId.value) {
      const deptId = Number(userDeptId.value)
      categories.value = resCats.data.filter((c: any) => Number(c.id) === deptId)
    } else {
      categories.value = resCats.data
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    isLoading.value = false
  }
}

const openModalCreate = () => {
  isEditing.value = false
  editId.value = null
  form.value = {
    title: '', title_en: '', url: '', slug: '', category_id: '',
    desc: '', desc_en: '', icon: '', visibility: 'INTERNAL', is_active: true
  }
  showModal.value = true
}

const openModalEdit = (link: any) => {
  isEditing.value = true
  editId.value = link.id
  form.value = {
    title: link.title,
    title_en: link.title_en || '', // <-- Tambahkan
    url: link.url,
    slug: link.slug,
    category_id: link.category_id,
    desc: link.desc || '',
    desc_en: link.desc_en || '',
    icon: link.icon || '',
    visibility: link.visibility || 'INTERNAL',
    is_active: link.is_active
  }
  showModal.value = true
}

const closeModal = () => showModal.value = false

const saveLink = async () => {
  if (!form.value.title || !form.value.url || !form.value.category_id) {
    alert('Mohon lengkapi Judul, URL Asli, dan Kategori.')
    return
  }

  isSaving.value = true
  try {
    if (isEditing.value && editId.value) {
      await api.put(`/admin/links/${editId.value}`, form.value)
      alert('Link berhasil diperbarui!')
    } else {
      await api.post('/admin/links', form.value)
      alert('Link berhasil dibuat!')
    }
    closeModal()
    fetchData()
  } catch (error: any) {
    alert(error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data')
  } finally {
    isSaving.value = false
  }
}

// --- OPEN GRAPH PREVIEW URL ---
const urlPreviewData = ref<any>(null)
const isLoadingPreview = ref(false)
let urlTimeout: number

watch(() => form.value.url, (newUrl) => {
  if (!newUrl || !newUrl.startsWith('http')) {
    urlPreviewData.value = null
    return
  }
  clearTimeout(urlTimeout)
  urlTimeout = window.setTimeout(async () => {
    isLoadingPreview.value = true
    try {
      const res = await api.get(`/admin/links/preview?url=${encodeURIComponent(newUrl)}`)
      urlPreviewData.value = res.data
    } catch(e) {
      urlPreviewData.value = { error: true }
    } finally {
      isLoadingPreview.value = false
    }
  }, 800)
})

const deleteLink = async (id: number) => {
  if (!confirm('Hapus link ini secara permanen?')) return
  try {
    await api.delete(`/admin/links/${id}`)
    links.value = links.value.filter(l => l.id !== id)
  } catch (error) {
    alert('Gagal menghapus data.')
  }
}

const copyToClipboard = (slug: string, id: number) => {
  const fullUrl = `${baseUrl}/s/${slug}`
  navigator.clipboard.writeText(fullUrl)
  copiedId.value = id
  setTimeout(() => copiedId.value = null, 2000)
}

const openLink = (slug: string) => window.open(`${baseUrl}/s/${slug}`, '_blank')

// --- QR CODE LOGIC ---
const openQrModal = (link: any) => {
  activeQrLink.value = link
  showQrModal.value = true
  // Reset options or keep previous
  setTimeout(generateQr, 100)
}

const generateQr = async () => {
  if (!activeQrLink.value || !qrCanvas.value) return

  const fullUrl = `${baseUrl}/s/${activeQrLink.value.slug}`
  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  try {
    const qrData = QRCode.create(fullUrl, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
    const { modules } = qrData
    const moduleCount = modules.size
    const margin = 4
    const size = 400
    const cellSize = size / (moduleCount + margin * 2)

    canvas.width = size
    canvas.height = size

    // Clear and build background
    ctx.fillStyle = qrOptions.value.bgColor
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = qrOptions.value.color

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize
          const y = (row + margin) * cellSize

          // Check if it's part of a Finder Pattern (Corners)
          const isTopLeft = row < 7 && col < 7
          const isTopRight = row < 7 && col >= moduleCount - 7
          const isBottomLeft = row >= moduleCount - 7 && col < 7

          if ((isTopLeft || isTopRight || isBottomLeft) && qrOptions.value.cornerShape === 'rounded') {
             // Draw rounded corner blocks
             // This is a simple approximation: circles for outer/inner frames
             // More complex logic can be added for perfect rounded rects
             ctx.beginPath()
             ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2)
             ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
            ctx.beginPath()
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.45, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, cellSize, cellSize)
          }
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

const downloadQr = () => {
  if (!qrCanvas.value || !activeQrLink.value) return
  const link = document.createElement('a')
  link.download = `qrcode-${activeQrLink.value.slug}.png`
  link.href = qrCanvas.value.toDataURL('image/png')
  link.click()
}

watch(qrOptions, generateQr, { deep: true })

const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const dayName = days[date.getDay()]
  const day = date.getDate()
  const monthName = months[date.getMonth()]
  const year = date.getFullYear()
  return `${dayName}, ${day} ${monthName} ${year}`
}

const getPeriodText = () => {
  if (filterMonth.value === 'all' && filterYear.value === 'all') return 'Semua Waktu'
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const monthName = filterMonth.value !== 'all' ? months[parseInt(filterMonth.value) - 1] : ''
  const yearName = filterYear.value !== 'all' ? filterYear.value : ''
  return `${monthName} ${yearName}`.trim()
}

const handleExportExcel = () => {
  const settings = JSON.parse(localStorage.getItem('public_settings') || '{}')
  const instansi = settings.instansi_name || 'SIGAP'
  const periode = getPeriodText()
  
  // Header Laporan di Excel
  let csvContent = `LAPORAN REKAPITULASI TAUTAN LAYANAN - ${instansi}\n`
  csvContent += `Periode: ${periode}\n\n`
  
  // Table Headers
  const headers = ['No', 'Nama Layanan', 'Kategori', 'Visibilitas', 'Status', 'Tanggal Daftar', 'Nama Pembuat', 'Username', 'Engagement (Klik)']
  csvContent += headers.join(';') + '\n'

  // Table Data
  processedLinks.value.forEach((link, index) => {
    const row = [
      index + 1,
      link.title,
      link.category?.name || '-',
      link.visibility === 'INTERNAL' ? 'Internal' : 'Khusus Kategori',
      link.is_active ? 'Tayang' : 'Draft',
      formatIndonesianDate(link.createdAt),
      link.createdBy?.fullName || 'Sistem',
      link.createdBy?.username || '-',
      link.clicks || 0
    ]
    csvContent += row.join(';') + '\n'
  })

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const fileName = `Rekap_Links_${periode.replace(/\s+/g, '_')}.csv`
  
  if ((navigator as any).msSaveBlob) {
    (navigator as any).msSaveBlob(blob, fileName)
  } else {
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handlePrintPDF = () => {
  window.print()
}

const showExportMenu = ref(false)

const filterMonth = ref('all')
const filterYear = ref('all')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = ref(10)

const settings = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('public_settings') || '{}')
  } catch (e) {
    return {}
  }
})

const yearsList = computed(() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
})

const processedLinks = computed(() => {
  let result = [...links.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l =>
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.slug && l.slug.toLowerCase().includes(q))
    )
  }

  result = result.filter(l => {
    if (!l.createdAt) return true
    const date = new Date(l.createdAt)
    const mMatch = filterMonth.value === 'all' || (date.getMonth() + 1).toString() === filterMonth.value.toString()
    const yMatch = filterYear.value === 'all' || date.getFullYear().toString() === filterYear.value.toString()
    return mMatch && yMatch
  })

  if (sortBy.value === 'a-z') {
    result.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  } else if (sortBy.value === 'z-a') {
    result.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
  } else if (sortBy.value === 'category-asc') {
    result.sort((a, b) => (a.category?.name || '').localeCompare(b.category?.name || ''))
  } else if (sortBy.value === 'category-desc') {
    result.sort((a, b) => (b.category?.name || '').localeCompare(a.category?.name || ''))
  } else if (sortBy.value === 'vis-asc') {
    result.sort((a, b) => (a.visibility || '').localeCompare(b.visibility || ''))
  } else if (sortBy.value === 'vis-desc') {
    result.sort((a, b) => (b.visibility || '').localeCompare(a.visibility || ''))
  } else if (sortBy.value === 'status-asc') {
    result.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1))
  } else if (sortBy.value === 'status-desc') {
    result.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? 1 : -1))
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return result
})

const totalPages = computed(() => Math.ceil(processedLinks.value.length / pageSize.value) || 1)

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return processedLinks.value.slice(start, start + pageSize.value)
})

watch([searchQuery, filterMonth, filterYear, sortBy], () => {
  currentPage.value = 1
})

// --- BULK IMPORT LOGIC ---
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)

const triggerImport = () => fileInput.value?.click()

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  isImporting.value = true
  try {
    const { data } = await api.post('/admin/links/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    alert(data.message)
    if (data.errors && data.errors.length > 0) {
      console.warn('Import partial errors:', data.errors)
    }
    fetchData()
  } catch (error: any) {
    alert(error.response?.data?.error || 'Gagal mengimpor data')
  } finally {
    isImporting.value = false
    if (target) target.value = ''
  }
}

const downloadTemplate = () => {
  // Menggunakan rute relatif /api yang sudah dikonfigurasi di axios.ts
  const apiBase = import.meta.env.VITE_API_URL || '/api'
  const token = localStorage.getItem('token')
  window.open(`${apiBase}/admin/links/template?token=${token}`, '_blank')
}

onMounted(fetchData)
</script>

<template>
  <div class="admin-container">
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
      <div class="title-group w-full md:w-auto flex-1">
        <div class="breadcrumb-mini text-sm font-bold text-slate-400 mb-1">Admin / Manajemen</div>
        <h2 class="title text-2xl font-black text-slate-800 dark:text-slate-100">Tautan Layanan</h2>
        <p class="subtitle text-sm text-slate-500">Kelola dan pantau seluruh link akses internal Anda.</p>
      </div>
      <div class="header-btns w-full md:w-auto mt-2 md:mt-0">
        <button @click="openModalCreate" class="w-full md:w-auto px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          <Plus :size="20" />
          <span>Tambah Link</span>
        </button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8 w-full">
      <div class="action-left w-full lg:flex-1 max-w-md">
        <div class="search-input-fancy w-full">
          <Search :size="18" class="icon-search" />
          <input v-model="searchQuery" type="text" placeholder="Cari layanan, slug, atau pembuat..." class="w-full bg-transparent dark:text-slate-100" />
        </div>
      </div>

      <div class="action-right flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
        <div class="filters-group">
          <div class="filter-item">
            <select v-model="filterMonth" class="filter-dropdown-v2">
              <option value="all">Semua Bulan</option>
              <option v-for="m in 12" :key="m" :value="m.toString()">
                {{ ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m-1] }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <select v-model="filterYear" class="filter-dropdown-v2">
              <option value="all">Tahun</option>
              <option v-for="y in yearsList" :key="y" :value="y.toString()">{{ y }}</option>
            </select>
          </div>
        </div>

        <div class="v-divider-small hidden md:block"></div>

        <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto mt-2 md:mt-0">
          <!-- Tombol Download Template -->
          <button @click="downloadTemplate" class="flex-1 sm:flex-none px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 dark:hover:bg-purple-500/30" title="Unduh Template (Excel)">
            <Download :size="18" />
            <span class="whitespace-nowrap">Template</span>
          </button>

          <!-- Tombol Import -->
          <input type="file" ref="fileInput" @change="handleImport" accept=".csv, .xlsx" style="display: none;" />
          <button @click="triggerImport" :disabled="isImporting" class="flex-1 sm:flex-none px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 dark:hover:bg-indigo-500/30">
            <Loader2 v-if="isImporting" class="animate-spin" :size="18" />
            <Upload v-else :size="18" />
            <span class="whitespace-nowrap">Import</span>
          </button>

          <!-- Hint for Employees -->
          <div v-if="userRole === 'EMPLOYEE'" class="hidden xl:flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800 text-[10px] font-bold">
            <LucideIcons.AlertCircle :size="14" />
            <span>Kategori Terkunci: Departemen Anda</span>
          </div>

          <!-- Dropdown Export -->
          <div class="export-dropdown-fancy flex-1 sm:flex-none relative">
            <button @click="showExportMenu = !showExportMenu" class="w-full px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600" :class="{ 'active': showExportMenu }">
              <Download :size="18" />
              <span class="whitespace-nowrap">Export</span>
              <ChevronDown :size="14" />
            </button>
            <div v-if="showExportMenu" class="export-popover !absolute right-0 mt-2 w-56 !z-50">
              <button @click="handleExportExcel(); showExportMenu = false" class="pop-item">
                <div class="pop-icon csv"><FileSpreadsheet :size="16" /></div>
                <div class="pop-text text-left">
                  <strong>Data Excel (.csv)</strong>
                  <span>Format data mentah</span>
                </div>
              </button>
              <button @click="handlePrintPDF(); showExportMenu = false" class="pop-item">
                <div class="pop-icon pdf"><Printer :size="16" /></div>
                <div class="pop-text text-left">
                  <strong>Dokumen PDF</strong>
                  <span>Siap untuk dicetak</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Table Container (Audit Log Style) -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider transition-colors">
                <th class="px-6 py-4 w-12 text-center">#ID</th>
                <th @click="sortBy = sortBy==='a-z'?'z-a':'a-z'" class="px-6 py-4 min-w-[300px] cursor-pointer">
                  Informasi Layanan <span class="sort-icon"><ChevronDown :size="12" /></span>
                </th>
                <th @click="sortBy = sortBy==='category-asc'?'category-desc':'category-asc'" class="px-6 py-4 hide-mobile min-w-[200px] cursor-pointer">
                  Kategori <span class="sort-icon"><ChevronDown :size="12" /></span>
                </th>
                <th @click="sortBy = sortBy==='vis-asc'?'vis-desc':'vis-asc'" class="px-6 py-4 min-w-[150px] cursor-pointer">
                  Akses <span class="sort-icon"><ChevronDown :size="12" /></span>
                </th>
                <th class="px-6 py-4 text-center">Status</th>
                <th class="px-6 py-4 text-right">Aksi & Kontrol</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
              <tr v-if="isLoading">
                <td colspan="6" class="empty-state">Loading...</td>
              </tr>
              <tr v-else-if="paginatedLinks.length === 0">
                <td colspan="6" class="empty-state">Data kosong.</td>
              </tr>

              <tr v-for="link in paginatedLinks" :key="link.id" class="row-item transition-none!">
                <td class="px-6 py-4 text-slate-400">#{{ link.id }}</td>
                <td class="px-6 py-4">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-400">
                      <component :is="(LucideIcons as any)[link.icon || 'FolderOpen']" :size="20" />
                    </div>
                    <div>
                      <span class="block font-bold text-slate-500 dark:text-slate-400">{{ link.title }}</span>
                      <span class="block text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{{ link.title_en }}</span>
                      <div class="mt-1 flex items-center gap-1 text-[11px] text-slate-400 opacity-70">
                        <span>/s/{{ link.slug }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 hide-mobile text-slate-500 dark:text-slate-400">
                  <div class="font-medium">{{ link.category ? link.category.name : '-' }}</div>
                  <div class="text-[10px] opacity-70">Oleh: {{ link.createdBy?.fullName || link.createdBy?.username || 'Sistem' }}</div>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400">
                  <div class="flex items-center gap-1 text-xs">
                    <Lock v-if="link.visibility === 'INTERNAL'" :size="12" />
                    <Building v-else :size="12" />
                    <span>{{ link.visibility === 'INTERNAL' ? 'Internal' : 'Khusus Kategori' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span v-if="link.is_active" class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-400">Aktif</span>
                  <span v-else class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400">Draft</span>
                </td>

                <td class="px-6 py-4 text-right">
                  <div class="super-action-group">
                    <div class="sub-group primary flex items-center justify-center gap-2">
                      <button @click="openLink(link.slug)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] hover:-translate-y-0.5 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 dark:hover:bg-blue-500/20" title="Buka Link">
                        <ExternalLink :size="16" />
                      </button>
                      <button @click="openQrModal(link)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#faf5ff] text-[#9333ea] border border-[#f3e8ff] hover:-translate-y-0.5 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30 dark:hover:bg-purple-500/20" title="QR Code">
                        <QrCode :size="16" />
                      </button>
                      <button @click="copyToClipboard(link.slug, link.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] hover:-translate-y-0.5 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30 dark:hover:bg-slate-500/20" :title="copiedId === link.id ? 'Tersalin!' : 'Salin Link'">
                        <Check v-if="copiedId === link.id" :size="16" class="text-emerald-500" />
                        <Copy v-else :size="16" />
                      </button>
                    </div>
                    
                    <div class="action-divider w-px h-8 bg-slate-200 dark:bg-slate-700/50 mx-2"></div>

                    <div class="sub-group admin flex items-center justify-center gap-2">
                      <button v-if="canModify(link)" @click="openModalEdit(link)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:-translate-y-0.5 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20" title="Edit">
                        <Edit2 :size="16" />
                      </button>
                      <button v-if="canModify(link)" @click="deleteLink(link.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2] hover:-translate-y-0.5 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/20" title="Hapus">
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    <!-- Pagination -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding: 0 8px;">
      <span style="font-size: 0.875rem; color: #64748b;">
        Menampilkan {{ paginatedLinks.length }} data, dari total {{ processedLinks.length }} data 
        (Halaman {{ currentPage }} dari {{ totalPages }})
      </span>
      <div style="display: flex; gap: 8px;">
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all">Prev</button>
        <button @click="currentPage++" :disabled="currentPage >= totalPages" class="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all">Next</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay bg-slate-900/40 backdrop-blur-[2px]" @click.self="closeModal">
        <div class="modal-content border border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-white/95 backdrop-blur-2xl dark:bg-slate-800/95 dark:text-slate-100 dark:border-blue-500/60 dark:shadow-[0_0_50px_rgba(59,130,246,0.45)]">
          <div class="modal-header dark:bg-slate-800 dark:border-slate-700/50">
            <h3 class="dark:text-slate-100">{{ isEditing ? 'Edit Layanan' : 'Tambah Layanan Baru' }}</h3>
            <button type="button" @click="closeModal" class="btn-close hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1">
              <X :size="20" />
            </button>
          </div>

          <form @submit.prevent="saveLink" class="modal-body">

            <div class="form-row">
              <div class="form-group">
                <label class="dark:text-slate-300">Judul Layanan (ID) <span class="req">*</span></label>
                <input v-model="form.title" type="text" placeholder="Contoh: E-Kinerja" required class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400" />
              </div>
              <div class="form-group">
                <label class="dark:text-slate-300">Title (EN) 🤖</label>
                <input v-model="form.title_en" type="text" placeholder="Kosongkan utk Auto-Translate" class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="position: relative;">
                <label class="dark:text-slate-300">URL Asli <span class="req">*</span></label>
                <input v-model="form.url" type="url" placeholder="https://..." required class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400" />
                
                <div v-if="isLoadingPreview" style="font-size: 0.75rem; color: #64748b; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                  <Loader2 style="animation: spin 1s linear infinite;" :size="12" /> Memuat preview Open Graph...
                </div>
                <div v-else-if="urlPreviewData && !urlPreviewData.error" class="og-preview" style="margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; background: #f8fafc; height: 60px;">
                  <div class="og-thumb" style="width: 60px; background: #e2e8f0; flex-shrink: 0;">
                    <img v-if="urlPreviewData.image" :src="urlPreviewData.image" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                  <div style="padding: 6px 10px; flex: 1; min-width: 0;">
                    <h5 class="og-title" style="margin: 0; font-size: 0.75rem; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{urlPreviewData.title}}</h5>
                    <p class="og-desc" style="margin: 2px 0 0; font-size: 0.65rem; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{urlPreviewData.description}}</p>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="dark:text-slate-300">Slug (Opsional)</label>
                <input v-model="form.slug" type="text" placeholder="Biarkan kosong utk auto-generate" class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="dark:text-slate-300">Kategori <span class="req">*</span></label>
                <select v-model="form.category_id" required class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100">
                  <option value="" disabled>Pilih Kategori</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="dark:text-slate-300">Pilih Ikon</label>
                <button 
                  type="button" 
                  class="icon-preview-btn-v2 dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100" 
                  @click="showIconModal = true"
                >
                  <component :is="(LucideIcons as any)[form.icon || 'FolderOpen']" :size="20" />
                  <span>{{ form.icon || 'FolderOpen' }} (Klik untuk Ubah)</span>
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="dark:text-slate-300">Visibility (Akses) <span class="req">*</span></label>
                <div class="select-wrapper">
                  <select v-model="form.visibility" class="select-vis dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100">
                    <option value="INTERNAL">🔒 Internal (Login)</option>
                    <option value="DEPARTMENT">🏢 Khusus Kategori</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-group toggle-group dark:bg-slate-700/50 dark:border-slate-600">
              <label class="toggle-label">
                <div class="toggle-text">
                  <span class="dark:text-slate-200">Status Tayang</span>
                  <small class="dark:text-slate-400">Matikan jika ingin menyembunyikan link sementara (Draft).</small>
                </div>
                <button type="button" class="toggle-switch" :class="{ 'on': form.is_active }"
                  @click="form.is_active = !form.is_active">
                  <div class="toggle-knob"></div>
                </button>
              </label>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="dark:text-slate-300">Deskripsi (ID) 🤖</label>
                <textarea v-model="form.desc" rows="2"
                  placeholder="Biarkan kosong agar AI menulis deskripsi untuk Anda..." class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400"></textarea>
                <small style="color: #64748b; font-size: 0.75rem;">
                  *Kosongkan untuk Auto-Generate dari Judul.
                </small>
              </div>
              <div class="form-group">
                <label class="dark:text-slate-300">Description (EN) 🤖</label>
                <textarea v-model="form.desc_en" rows="2" placeholder="Kosongkan untuk Auto-Translate..." class="dark:bg-slate-600 dark:border-slate-500 dark:text-slate-100 placeholder-slate-400"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" @click="closeModal" class="btn-cancel">Batal</button>
              <button type="submit" class="btn-save" :disabled="isSaving">
                <Loader2 v-if="isSaving" class="spinner" :size="18" />
                <Save v-else :size="18" />
                {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- QR CODE MODAL -->

    <IconSelectorModal 
      :isOpen="showIconModal" 
      :currentIcon="form.icon || 'FolderOpen'"
      @close="showIconModal = false"
      @select="(icon) => form.icon = icon"
    />
    <div v-if="showQrModal" class="modal-overlay" @click.self="showQrModal = false">
      <div class="modal-content" style="max-width: 700px;">
          <div class="modal-header">
            <h3>Custom Barcode (QR Code)</h3>
            <button type="button" @click="showQrModal = false" class="btn-close">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 12px; padding: 20px;">
              <canvas ref="qrCanvas" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"></canvas>
              <p style="margin-top: 12px; font-size: 0.75rem; color: #64748b; font-family: monospace;">/s/{{ activeQrLink?.slug }}</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-group">
                <label>Bentuk Titik (Shape)</label>
                <select v-model="qrOptions.shape" style="width: 100%;">
                  <option value="square">Kotak (Square)</option>
                  <option value="circle">Bulat (Circle)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Model Sudut (Corner Shape)</label>
                <select v-model="qrOptions.cornerShape" style="width: 100%;">
                  <option value="square">Kotak Tajam</option>
                  <option value="rounded">Rounded (Halus)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Kepadatan (Error Correction)</label>
                <select v-model="qrOptions.errorLevel" style="width: 100%;">
                  <option value="L">Rendah (Low)</option>
                  <option value="M">Medium</option>
                  <option value="Q">Quartile</option>
                  <option value="H">Tinggi (High)</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Warna QR</label>
                  <input v-model="qrOptions.color" type="color" style="height: 40px; padding: 2px;" />
                </div>
                <div class="form-group">
                  <label>Background</label>
                  <input v-model="qrOptions.bgColor" type="color" style="height: 40px; padding: 2px;" />
                </div>
              </div>

              <button @click="downloadQr" class="btn-save" style="margin-top: 8px; justify-content: center; background: #4f46e5;">
                <Download :size="18" /> Unduh Barcode (.png)
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- TEMPLATE LAPORAN CETAK (HIDDEN IN SCREEN) -->
    <div class="print-only">
      <div class="print-header">
        <img v-if="settings.logo_url" 
             :src="baseUrl + settings.logo_url" 
             class="print-logo" />
        <div class="print-title-area">
          <h1>LAPORAN REKAPITULASI TAUTAN LAYANAN</h1>
          <h2>{{ settings.instansi_name || 'Portal SIGAP' }}</h2>
          <p>Periode Re-kap: {{ getPeriodText() }} (Dicetak pada: {{ formatIndonesianDate(new Date().toISOString()) }})</p>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th>Nama Layanan</th>
            <th>Kategori</th>
            <th>Visibilitas</th>
            <th>Status</th>
            <th>Tanggal Daftar</th>
            <th>Pembuat</th>
            <th>Engagement</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(link, i) in processedLinks" :key="link.id">
            <td class="text-center">{{ i + 1 }}</td>
            <td class="fw-bold">{{ link.title }}</td>
            <td>{{ link.category?.name || '-' }}</td>
            <td>{{ link.visibility }}</td>
            <td>{{ link.is_active ? 'Tayang' : 'Draft' }}</td>
            <td>{{ formatIndonesianDate(link.createdAt) }}</td>
            <td>{{ link.createdBy?.fullName }} (@{{ link.createdBy?.username }})</td>
            <td class="text-center">{{ link.clicks }} Klik</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="print-stats">
          Total Tautan: <strong>{{ processedLinks.length }}</strong> | 
          Total Engagement: <strong>{{ processedLinks.reduce((acc, l) => acc + (l.clicks || 0), 0) }} Klik</strong>
        </div>
        <p>Laporan ini dihasilkan secara otomatis oleh sistem SIGAP.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* BASE STYLES */
/* PREMIUM THEME & LAYOUT */
.admin-container {
  padding: 2rem;
  max-width: 2000px; /* Maximum expansion as requested */
  margin: 0 auto;
  min-height: 100vh;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

.breadcrumb-mini {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6366f1;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  margin-top: 0.25rem;
}

/* STATS OVERVIEW */
.stats-overview-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-item {
  background: white;
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.stat-lab {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
  margin-top: 2px;
}

/* ACTION BAR V3 */
.action-bar-v3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
}

.search-input-fancy {
  position: relative;
  width: 100%;
  max-width: 400px;
  display: flex;
  align-items: center;
}

.icon-search {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  z-index: 5;
}

.search-input-fancy input {
  width: 100%;
  min-width: 0;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.search-input-fancy input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.action-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filters-group {
  display: flex;
  gap: 0.5rem;
  padding: 4px;
  background: #dbeafe; /* Lebih Biru (Blue 100) */
  border-radius: 12px;
}

.filter-item select.filter-dropdown-v2 {
  background: #dbeafe;
  border: 1px solid #93c5fd;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e40af;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
}

.filter-item select.filter-dropdown-v2:hover {
  background: #bfdbfe;
}

:global(.dark) .filter-item select.filter-dropdown-v2 {
  background: #1e293b !important;
  color: #c7d2fe !important;
  border-color: #312e81 !important;
}

:global(.dark) .filters-group {
  background: #1e1b4b !important;
}

/* PAGINATION */
.btn-page {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 50px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #94a3b8;
}

/* BUTTONS PRIMARY */
.btn-primary-gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary-gradient:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 15px -3px rgba(79, 70, 229, 0.4);
}

.shadow-btn {
  box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
}

.btn-action-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  color: white;
}

.btn-import {
  background: #10b981;
}
.btn-import:hover {
  background: #059669;
  box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
}

.btn-export {
  background: #f59e0b;
}
.btn-export:hover {
  background: #d97706;
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.4);
}

.btn-purple {
  background: #7c3aed;
}
.btn-purple:hover {
  background: #6d28d9;
  box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.4);
}

:global(.dark) .admin-container {
  background: #0f172a;
}

:global(.dark) .row-item { background: #1e293b; color: #94a3b8; }
.row-item:hover { background: transparent !important; }

/* ACTION BUTTONS */
.super-action-group {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.sub-group {
  display: flex;
  gap: 6px;
}

.action-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
}

.btn-action-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f1f5f9;
  color: #64748b;
}

.btn-action-icon:hover { transform: translateY(-2px); }

/* DISTINCT COLORS */
.btn-action-icon.blue { background: #eff6ff; color: #2563eb; border-color: #dbeafe; }
.btn-action-icon.purple { background: #f5f3ff; color: #7c3aed; border-color: #ede9fe; }
.btn-action-icon.amber { background: #fffbeb; color: #d97706; border-color: #fef3c7; }
.btn-action-icon.red { background: #fef2f2; color: #dc2626; border-color: #fee2e2; }
.btn-action-icon.gray { background: #f8fafc; color: #475569; border-color: #e2e8f0; }

.btn-action-icon.blue:hover { background: #dbeafe; }
.btn-action-icon.purple:hover { background: #ede9fe; }
.btn-action-icon.amber:hover { background: #fef3c7; }
.btn-action-icon.red:hover { background: #fee2e2; }
.btn-action-icon.gray:hover { background: #f1f5f9; }

:global(.dark) .btn-action-icon {
  background: #1e293b;
  border-color: #334155;
}

:global(.dark) .btn-action-icon.blue { background: rgba(37, 99, 235, 0.1); color: #60a5fa; border-color: rgba(37, 99, 235, 0.3); }
:global(.dark) .btn-action-icon.purple { background: rgba(124, 58, 237, 0.1); color: #a78bfa; border-color: rgba(124, 58, 237, 0.3); }
:global(.dark) .btn-action-icon.amber { background: rgba(217, 119, 6, 0.1); color: #fbbf24; border-color: rgba(217, 119, 6, 0.3); }
:global(.dark) .btn-action-icon.red { background: rgba(220, 38, 38, 0.1); color: #f87171; border-color: rgba(220, 38, 38, 0.3); }
:global(.dark) .btn-action-icon.gray { background: rgba(148, 163, 184, 0.1); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.3); }

/* STATUS BADGE */
.status-badge {
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-block;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

:global(.dark) .status-badge.active {
  background: rgba(22, 101, 52, 0.2);
  color: #4ade80;
}

:global(.dark) .status-badge.inactive {
  background: rgba(153, 27, 27, 0.2);
  color: #f87171;
}

/* VISIBILITY BADGE */
.vis-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.vis-badge.INTERNAL {
  background: #f1f5f9;
  color: #475569;
}

.vis-badge.DEPARTMENT {
  background: #f5f3ff;
  color: #7c3aed;
}

:global(.dark) .vis-badge.INTERNAL {
  background: #334155;
  color: #cbd5e1;
}

:global(.dark) .vis-badge.DEPARTMENT {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
}

.link-subtitle {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
  margin-top: 2px;
}

/* MODAL & FORM STYLES */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 550px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  margin: 1rem;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.btn-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.4rem;
}

.req {
  color: #ef4444;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  font-size: 0.9rem;
}

.select-vis {
  background-color: #f8fafc;
  font-weight: 600;
  color: #334155;
}

/* TOGGLE SWITCH STYLE (INI YANG DULU ANDA SUKA) */
.toggle-group {
  border: 1px solid #e2e8f0;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
}

.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.toggle-text span {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.toggle-text small {
  font-size: 0.75rem;
  color: #64748b;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: #cbd5e1;
  border-radius: 50px;
  border: none;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-switch.on {
  background: #22c55e;
}

.toggle-knob {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.toggle-switch.on .toggle-knob {
  transform: translateX(20px);
}

.modal-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel {
  padding: 0.6rem 1.2rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #64748b;
}

.btn-save {
  padding: 0.6rem 1.5rem;
  border: none;
  background: #0f172a;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .hide-mobile {
    display: none;
  }
}

/* EXPORT POPUP FANCY */
.export-dropdown-fancy {
  position: relative;
}

.btn-export-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.25rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export-trigger.active {
  background: #f1f5f9;
  border-color: #6366f1;
  color: #6366f1;
}

.export-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 280px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--card-border);
  z-index: 1000;
  padding: 8px;
  animation: popIn 0.2s ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.pop-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem;
  border-radius: 12px;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.pop-item:hover {
  background: var(--bg-main);
}

.pop-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pop-icon.csv { background: #ecfdf5; color: #10b981; }
.pop-icon.pdf { background: #eff6ff; color: #3b82f6; }
.pop-icon.import { background: #fff7ed; color: #f59e0b; }

.pop-text strong {
  display: block;
  font-size: 0.85rem;
  color: var(--text-main);
}

.pop-text span {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.pop-divider {
  height: 1px;
  background: var(--card-border);
  margin: 8px 0;
}

/* SORT ICON */
.sort-icon {
  display: inline-flex;
  margin-left: 4px;
  color: #94a3b8;
}

.cursor-pointer { cursor: pointer; user-select: none; }

/* PRINT STYLES */
.print-only {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 1.5cm;
  }
  
  /* Hide all UI elements */
  nav, .admin-container > *:not(.print-only), .modal-overlay, .btn-ghost, .btn-add, .action-bar, .pagination, footer, .export-dropdown-wrapper {
    display: none !important;
  }
  
  .print-only {
    display: block !important;
    background: white;
    color: black;
    font-family: 'Times New Roman', serif;
    width: 100%;
  }

  .print-header {
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 3px double #000;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  
  .print-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
  }

  .print-title-area {
    flex: 1;
    text-align: center;
  }
  
  .print-title-area h1 {
    font-size: 18pt;
    font-weight: bold;
    margin: 0;
  }
  
  .print-title-area h2 {
    font-size: 14pt;
    margin: 5px 0;
  }
  
  .print-title-area p {
    font-size: 10pt;
    font-style: italic;
    margin: 3px 0;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  
  .print-table th, .print-table td {
    border: 1px solid #000;
    padding: 8px 6px;
    font-size: 9pt;
  }
  
  .print-table th {
    background: #f0f0f0 !important;
    -webkit-print-color-adjust: exact;
    font-weight: bold;
    text-align: center;
  }

  .print-footer {
    margin-top: 30px;
    font-size: 10pt;
    text-align: right;
  }
  
  .print-stats {
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .fw-bold { font-weight: bold; }
  .text-center { text-align: center; }
}
.icon-preview-btn-v2 {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.icon-preview-btn-v2:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
}

:global(.dark) .icon-preview-btn-v2 {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}
</style>
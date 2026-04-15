<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import { 
  ClipboardList, Search, Eye, Filter, 
  Calendar, User, Globe, Activity, X, ChevronLeft, ChevronRight,
  Download, FileText, FileSpreadsheet, FileJson, Printer
} from 'lucide-vue-next'

const logs = ref<any[]>([])
const isLoading = ref(true)
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const limit = ref(10)
const limitOptions = [10, 20, 30, 40, 50, 75, 100]

const filterAction = ref('')
const filterResource = ref('')
const filterYear = ref('')
const filterMonth = ref('')
const filterDay = ref('')
const filterDayEnd = ref('')
const availableActions = ref<string[]>([])
const availableResources = ref<string[]>([])
const availableYears = ref<number[]>([])
const searchQuery = ref('')
const selectedLog = ref<any>(null)
const showDetailModal = ref(false)
const showExportMenu = ref(false)

const months = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
]

// --- LOGIC PAGINATION BERLAPIS ---
const displayedPages = computed(() => {
  const current = page.value
  const total = totalPages.value
  const delta = 2
  const left = current - delta
  const right = current + delta + 1
  const range = []
  const rangeWithDots = []
  let l

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i < right)) {
      range.push(i)
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
})

const changePage = (p: any) => {
  if (p === '...') return
  page.value = p
  fetchData()
}
const fetchData = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: limit.toString(),
      action: filterAction.value,
      resource: filterResource.value,
      year: filterYear.value,
      month: filterMonth.value,
      day: filterDay.value,
      dayEnd: filterDayEnd.value,
    })
    
    const { data } = await api.get(`/admin/audit-logs?${params.toString()}`)
    logs.value = data.data
    total.value = data.meta.total
    totalPages.value = data.meta.totalPages
  } catch (error) {
    console.error('Gagal mengambil audit logs:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchMetadata = async () => {
  try {
    const { data } = await api.get('/admin/audit-logs/metadata')
    availableActions.value = data.actions
    availableResources.value = data.resources
    availableYears.value = data.years
  } catch (error) {
    console.error('Gagal mengambil metadata logs:', error)
  }
}

// --- LOGIC GROUPING ---
const shouldShowYearHeader = (index: number) => {
  if (index === 0) return true
  const curr = new Date(logs.value[index].createdAt).getFullYear()
  const prev = new Date(logs.value[index - 1].createdAt).getFullYear()
  return curr !== prev
}

const shouldShowMonthHeader = (index: number) => {
  const currDate = new Date(logs.value[index].createdAt)
  const currYear = currDate.getFullYear()
  const currMonth = currDate.getMonth()

  if (index === 0) return true
  
  const prevDate = new Date(logs.value[index - 1].createdAt)
  const prevYear = prevDate.getFullYear()
  const prevMonth = prevDate.getMonth()
  
  return currMonth !== prevMonth || currYear !== prevYear
}

const shouldShowDateHeader = (index: number) => {
  const currDate = new Date(logs.value[index].createdAt)
  const currYear = currDate.getFullYear()
  const currMonth = currDate.getMonth()
  const currDay = currDate.getDate()

  if (index === 0) return true

  const prevDate = new Date(logs.value[index - 1].createdAt)
  const prevYear = prevDate.getFullYear()
  const prevMonth = prevDate.getMonth()
  const prevDay = prevDate.getDate()

  return currDay !== prevDay || currMonth !== prevMonth || currYear !== prevYear
}

const getMonthName = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('id-ID', { month: 'long' })
}

const getDayName = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('id-ID', { day: 'numeric', month: 'long' })
}

const openDetail = (log: any) => {
  selectedLog.value = log
  showDetailModal.value = true
}

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const getActionBadgeClass = (action: string) => {
  if (action.includes('CREATE')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (action.includes('DELETE')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
}

const getActionLabel = (action: string) => {
  const map: Record<string, string> = {
    'CREATE_LINK': 'Tambah Link',
    'UPDATE_LINK': 'Update Link',
    'DELETE_LINK': 'Hapus Link',
    'CREATE_CATEGORY': 'Tambah Kategori',
    'UPDATE_CATEGORY': 'Update Kategori',
    'DELETE_CATEGORY': 'Hapus Kategori',
    'CREATE_USER': 'Tambah User',
    'UPDATE_USER': 'Update User',
    'DELETE_USER': 'Hapus User',
    'UPDATE_SETTINGS': 'Update Pengaturan',
    'BULK_IMPORT_LINKS': 'Impor Massal',
    'LOGIN_SUCCESS': 'Login Berhasil',
    'UPDATE_PROFILE': 'Update Profil',
    'BACKUP_DATABASE': 'Backup Database',
    'RESET_SYSTEM': 'Reset Sistem',
    'CREATE_FOOTER_LINK': 'Tambah Footer',
    'UPDATE_FOOTER_LINK': 'Update Footer',
    'DELETE_FOOTER_LINK': 'Hapus Footer',
    'UPDATE_FEEDBACK_STATUS': 'Update Feedback',
    'DELETE_FEEDBACK': 'Hapus Feedback',
    'SEND_FEEDBACK': 'Kirim Feedback',
    'EXPORT_AUDIT_LOGS': 'Ekspor Log'
  }
  return map[action] || action
}

onMounted(() => {
  fetchData()
  fetchMetadata()
})

watch([limit, filterAction, filterResource, filterYear, filterMonth, filterDay, filterDayEnd], () => {
  page.value = 1
  fetchData()
})

// --- LOGIC EXPORT ---
const isExporting = ref(false)

const handleExport = async (format: 'txt' | 'excel' | 'pdf') => {
  if (format === 'pdf') {
    window.print()
    return
  }

  isExporting.value = true
  try {
    const params = new URLSearchParams({
      action: filterAction.value,
      resource: filterResource.value,
      year: filterYear.value,
      month: filterMonth.value,
      day: filterDay.value,
      dayEnd: filterDayEnd.value,
    })
    
    // Ambil data tanpa limit (Backend sudah kita siapkan /export)
    const { data } = await api.get(`/admin/audit-logs/export?${params.toString()}`)
    
    if (format === 'txt') {
      exportAsTxt(data)
    } else if (format === 'excel') {
      exportAsExcel(data)
    }
  } catch (error) {
    alert('Gagal mendownload data.')
  } finally {
    isExporting.value = false
    showExportMenu.value = false
  }
}

const exportAsTxt = (data: any[]) => {
  let content = `REKAP AUDIT LOGS - SIGAP\n`
  content += `Dicetak pada: ${new Date().toLocaleString()}\n`
  content += `------------------------------------------------------------\n\n`
  
  data.forEach((log, i) => {
    content += `[${i + 1}] Waktu: ${formatDateTime(log.createdAt)}\n`
    content += `    User: ${log.user.fullName} (${log.user.username})\n`
    content += `    Aksi: ${getActionLabel(log.action)}\n`
    content += `    Resource: ${log.resource} #${log.resourceId}\n`
    content += `    IP: ${log.ipAddress}\n`
    content += `    Details: ${log.details}\n`
    content += `------------------------------------------------------------\n`
  })

  downloadBlob(content, 'AuditLogs.txt', 'text/plain')
}

const exportAsExcel = (data: any[]) => {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headers = ["No", "Waktu", "User", "Aksi", "Resource", "ID", "IP Address", "Keterangan"]
  let csvContent = headers.map(escapeCsv).join(';') + '\n'
  
  data.forEach((log, i) => {
    const row = [
      i + 1,
      formatDateTime(log.createdAt),
      `${log.user.fullName} (${log.user.username})`,
      getActionLabel(log.action),
      log.resource,
      log.resourceId,
      log.ipAddress,
      log.details.replace(/\n/g, ' ')
    ]
    csvContent += row.map(escapeCsv).join(';') + '\n'
  })

  downloadBlob('\ufeff' + csvContent, 'AuditLogs.csv', 'text/csv;charset=utf-8;')
}

const downloadBlob = (content: string, fileName: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 print:hidden">
      <div class="animate-fadein">
        <h1 class="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ClipboardList :size="32" class="text-blue-600" />
          Log Aktivitas
        </h1>
        <p class="text-slate-500 dark:text-slate-400 font-medium">Monitoring setiap jejak digital administrator & staf.</p>
      </div>

      <div class="relative">
        <button 
          @click="showExportMenu = !showExportMenu"
          class="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Download :size="20" />
          <span>Export Logs</span>
        </button>

        <Transition name="fade">
          <div v-if="showExportMenu" class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-2 animate-fadeup">
            <button @click="handleExport('pdf')" class="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Printer class="text-rose-500" :size="18" /> PDF (Print View)
            </button>
            <button @click="handleExport('excel')" class="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              <FileSpreadsheet class="text-emerald-500" :size="18" /> Excel / CSV
            </button>
            <button @click="handleExport('txt')" class="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              <FileText class="text-blue-500" :size="18" /> Teks Murni (TXT)
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Filters (Robust Responsive Grid) -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4 items-center transition-colors">
      <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
        <Filter :size="18" class="text-slate-400" />
        <select v-model="filterAction" class="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none">
          <option value="">Semua Aksi</option>
          <option v-for="act in availableActions" :key="act" :value="act">{{ getActionLabel(act) }}</option>
        </select>
      </div>

      <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
        <Activity :size="18" class="text-slate-400" />
        <select v-model="filterResource" class="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none flex-1">
          <option value="">Semua Resource</option>
          <option v-for="res in availableResources" :key="res" :value="res">{{ res }}</option>
        </select>
      </div>

      <!-- Time Filters (Grid stack for Mobile) -->
      <div class="grid grid-cols-1 xs:grid-cols-2 md:flex md:items-center gap-3 md:gap-4 border-l-0 md:border-l border-slate-200 dark:border-slate-700 pl-0 md:pl-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0">
        <div class="flex items-center gap-2">
          <label class="text-[10px] font-bold text-slate-400 uppercase w-10 md:w-auto">Year</label>
          <select v-model="filterYear" class="flex-1 md:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs outline-none min-w-[80px]">
            <option value="">All</option>
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
 
        <div v-if="filterYear" class="flex items-center gap-2">
          <label class="text-[10px] font-bold text-slate-400 uppercase w-10 md:w-auto">Month</label>
          <select v-model="filterMonth" class="flex-1 md:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs outline-none min-w-[100px]">
            <option value="">All</option>
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
 
        <div v-if="filterMonth" class="flex items-center gap-2 col-span-full md:col-auto">
          <label class="text-[10px] font-bold text-slate-400 uppercase w-10 md:w-auto">Day</label>
          <div class="flex items-center gap-1 flex-1">
            <input v-model="filterDay" type="number" min="1" max="31" placeholder="Dari" class="w-full md:w-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs outline-none" />
            <span v-if="filterDay" class="text-xs text-slate-400">-</span>
            <input v-if="filterDay" v-model="filterDayEnd" type="number" min="1" max="31" placeholder="Ke" class="w-full md:w-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs outline-none" />
          </div>
        </div>
      </div>

      <div class="text-sm text-slate-500 dark:text-slate-400 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 pt-2 sm:pt-0 sm:ml-auto">
        Total: <span class="font-bold text-slate-800 dark:text-slate-200">{{ total }}</span> Log
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
              <th class="px-6 py-4">Waktu</th>
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Aksi</th>
              <th class="px-6 py-4">Resource</th>
              <th class="px-6 py-4">IP Address</th>
              <th class="px-6 py-4 text-center">Detail</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <template v-if="isLoading">
              <tr v-for="i in 5" :key="i">
                <td colspan="6" class="px-6 py-4">
                  <div class="h-4 bg-slate-100 dark:bg-slate-700 animate-pulse rounded w-full"></div>
                </td>
              </tr>
            </template>
            <template v-else-if="logs.length > 0">
              <template v-for="(log, index) in logs" :key="log.id">
                <!-- Year Header -->
                <tr v-if="shouldShowYearHeader(index)" class="bg-slate-100/50 dark:bg-slate-700/30">
                  <td colspan="6" class="px-6 py-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    <div class="flex items-center gap-2">
                      <div class="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                      Tahun {{ new Date(log.createdAt).getFullYear() }}
                      <div class="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  </td>
                </tr>
                <!-- Month Header -->
                <tr v-if="shouldShowMonthHeader(index)" class="bg-white dark:bg-slate-800">
                  <td colspan="6" class="px-6 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-900/30">
                    {{ getMonthName(log.createdAt) }}
                  </td>
                </tr>
                <!-- Date Header -->
                <tr v-if="shouldShowDateHeader(index)" class="bg-slate-50/50 dark:bg-slate-900/20">
                  <td colspan="6" class="px-8 py-2 text-xs font-bold text-slate-400 italic">
                    {{ getDayName(log.createdAt) }}
                  </td>
                </tr>

                <tr class="row-item transition-none!">
                  <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    <div class="flex items-center gap-2">
                      <Activity :size="14" class="text-slate-300" />
                      {{ new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs">
                        {{ log.user.fullName?.charAt(0) || log.user.username.charAt(0) }}
                      </div>
                      <div>
                        <div class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ log.user.fullName || log.user.username }}</div>
                        <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">{{ log.user.role }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="['px-2 py-1 rounded text-[11px] font-bold uppercase', getActionBadgeClass(log.action)]">
                      {{ getActionLabel(log.action) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {{ log.resource }}
                    <span v-if="log.resourceId" class="text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded ml-1">#{{ log.resourceId }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm font-mono text-slate-400">
                    <div class="flex items-center gap-1">
                      <Globe :size="14" />
                      {{ log.ipAddress || '-' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button @click="openDetail(log)" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
                      <Eye :size="18" />
                    </button>
                  </td>
                </tr>
              </template>
            </template>
            <tr v-else>
              <td colspan="6" class="px-6 py-20 text-center text-slate-400">
                <div class="flex flex-col items-center gap-2">
                  <ClipboardList :size="48" class="opacity-20" />
                  <p>Belum ada data log aktivitas.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1 || limit !== 10" class="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tampilkan</span>
        <select v-model="limit" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
          <option v-for="opt in limitOptions" :key="opt" :value="opt">{{ opt }} Baris</option>
        </select>
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none ml-2">
          Total: {{ total }} Data
        </span>
      </div>

      <div class="flex items-center gap-6">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
          Hal <span class="text-slate-700 dark:text-slate-200">{{ page }}</span> dari {{ totalPages }}
        </span>
        
        <div class="flex items-center gap-1">
          <button 
            @click="changePage(page - 1)" 
            :disabled="page === 1" 
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
          >
            &lsaquo;
          </button>

          <div class="flex items-center gap-1 mx-2">
            <button 
              v-for="p in displayedPages" :key="p"
              @click="changePage(p)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
              :class="[
                p === page 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : p === '...' 
                    ? 'text-slate-400 cursor-default' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              ]"
            >
              {{ p }}
            </button>
          </div>

          <button 
            @click="changePage(page + 1)" 
            :disabled="page === totalPages" 
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
          >
            &rsaquo;
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">Detail Aktivitas</h3>
            <button @click="showDetailModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X :size="20" />
            </button>
          </div>
          <div class="p-6 overflow-y-auto max-h-[70vh]">
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Aksi</label>
                <span class="text-sm font-medium">{{ getActionLabel(selectedLog.action) }}</span>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Resource</label>
                <span class="text-sm font-medium">{{ selectedLog.resource }} #{{ selectedLog.resourceId }}</span>
              </div>
            </div>

            <div class="space-y-4">
              <label class="text-[10px] font-bold uppercase text-slate-400 block">Payload / Perubahan Data (JSON)</label>
              <pre class="bg-slate-900 text-blue-400 p-4 rounded-xl text-xs overflow-auto font-mono scrollbar-thin scrollbar-thumb-slate-700">{{ JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2) }}</pre>
            </div>
          </div>
          <div class="p-6 bg-slate-50 dark:bg-slate-900 flex justify-end">
            <button @click="showDetailModal = false" class="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition-all">Tutup</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
:global(.dark) .row-item { background: #1e293b; color: #94a3b8; }
.row-item:hover { background: transparent !important; }
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* 📠 PRINT OPTIMIZATION (PDF) */
@media print {
  @page {
    size: landscape;
    margin: 1cm;
  }
  .print\:hidden { display: none !important; }
  .bg-white { background-color: white !important; }
  .text-slate-500 { color: #64748b !important; }
  table { width: 100% !important; border: 1px solid #e2e8f0 !important; }
  th, td { border: 1px solid #e2e8f0 !important; padding: 10px !important; }
  .rounded-xl, .shadow-sm { border-radius: 0 !important; box-shadow: none !important; }
}

.animate-fadein { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
</style>

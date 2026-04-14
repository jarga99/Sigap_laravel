<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { Download, LayoutDashboard, MousePointer2, Layers, Eye } from 'lucide-vue-next'
import api from '@/services/api' 
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/lib/config'

// Registrasi Komponen Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// State
const filterMonth = ref('all')
const filterYear = ref(new Date().getFullYear().toString())
const yearsList = computed(() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
})

const stats = ref({
  totalLinks: 0,
  totalCategories: 0,
  totalClicks: 0,
  totalEngagement: 0
})
const topLinks = ref([])
const rawChartData = ref([])
const isLoading = ref(true)

// --- CONFIG CHART (STACKED BAR) ---
const chartData = computed(() => {
  return {
    labels: rawChartData.value.map(item => {
      return item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title
    }),
    datasets: [
      {
        label: 'Tamu (Publik)',
        backgroundColor: '#fbbf24',
        data: rawChartData.value.map(item => item.stats.guest),
        stack: 'Stack 0',
        borderRadius: 4,
      },
      {
        label: 'Pegawai & Admin',
        backgroundColor: '#3b82f6',
        data: rawChartData.value.map(item => item.stats.user),
        stack: 'Stack 0',
        borderRadius: 4,
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20
      }
    },
    tooltip: {
      callbacks: {
        // Menambah info Kategori di tooltip saat hover
        afterLabel: function(context) {
          const index = context.dataIndex
          const item = rawChartData.value[index]
          if (context.datasetIndex === 1) {
             return `\nKategori: ${item.category}\nTotal: ${item.stats.total}`
          }
          return null
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true, // KUNCI: Agar sumbu X menumpuk
      grid: { display: false },
      ticks: { 
        font: { size: 11 }
      }
    },
    y: {
      stacked: true, // KUNCI: Agar sumbu Y menumpuk
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      border: { display: false }
    }
  },
  interaction: {
    mode: 'index', // Hover satu bar muncul semua info stack
    intersect: false,
  },
}

// Fetch Data
const fetchData = async () => {
  try {
    isLoading.value = true
    const { data } = await api.get(`/admin/dashboard?month=${filterMonth.value}&year=${filterYear.value}`) 
    stats.value = data.stats
    topLinks.value = data.topLinks
    rawChartData.value = data.chartData
  } catch (error) {
    console.error("Gagal ambil data dashboard", error)
  } finally {
    isLoading.value = false
  }
}

const downloadRecap = () => {
  const authStore = useAuthStore()
  // Ambil origin dinamis dari config
  const apiBase = API_BASE_URL
  const exportUrl = `${apiBase}/api/admin/dashboard/export?token=${authStore.token}`
  window.open(exportUrl, '_blank')
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard Utama</h1>
        <p class="text-slate-500 dark:text-slate-400">Ringkasan aktivitas portal tautan.</p>
      </div>
      <button 
        @click="downloadRecap" 
        class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium self-start"
      >
        <Download :size="18" />
        Unduh Rekap Data
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
        <div class="p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Tautan Aktif</p>
          <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ stats.totalLinks }}</h3>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
        <div class="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Kategori</p>
          <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ stats.totalCategories }}</h3>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
        <div class="p-3 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Klik (Semua)</p>
          <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ stats.totalClicks }}</h3>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
        <div class="p-3 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Link Engagement</p>
          <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ stats.totalEngagement }}</h3>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-lg text-slate-800 dark:text-slate-100">Statistik Link Terpopuler</h3>
        <div class="flex gap-2">
          <select v-model="filterMonth" @change="fetchData" class="text-sm border dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-700 dark:text-slate-200">
            <option value="all">Semua Bulan</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
          <select v-model="filterYear" @change="fetchData" class="text-sm border dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-700 dark:text-slate-200">
            <option v-for="y in yearsList" :key="y" :value="y.toString()">{{ y }}</option>
          </select>
        </div>
      </div>
      
      <div class="h-80 w-full relative">
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 z-10 transition-colors">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <Bar v-if="rawChartData.length > 0" :data="chartData" :options="chartOptions" />
        <div v-else-if="!isLoading" class="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
          Belum ada data klik.
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
      <div class="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 class="font-bold text-lg text-slate-800 dark:text-slate-100">Top 10 Tautan Terpopuler</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider transition-colors">
              <th class="px-6 py-4 w-12 text-center">#</th>
              <th class="px-6 py-4">Judul Link</th>
              <th class="px-6 py-4">Kategori</th>
              <th class="px-6 py-4 text-center">Total Diklik</th>
              <th class="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
            <tr v-for="(link, index) in topLinks" :key="link.id" class="row-item transition-none!">
              <td class="px-6 py-4 text-center font-bold text-slate-400 opacity-50">{{ index + 1 }}</td>
              <td class="px-6 py-4">
                <div class="font-bold text-slate-500 dark:text-slate-400">{{ link.title_id || link.title }}</div>
                <div class="text-[10px] text-slate-400 italic opacity-70">{{link.url}}</div>
              </td>
              <td class="px-6 py-4 text-slate-500 dark:text-slate-400">{{ link.category?.name || link.category?.name_id || '-' }}</td>
              <td class="px-6 py-4 text-center text-slate-500 dark:text-slate-400 font-bold">
                {{ link.clicks }}
              </td>
              <td class="px-6 py-4 text-center">
                <span v-if="link.is_active" class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-400">Aktif</span>
                <span v-else class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400">Nonaktif</span>
              </td>
            </tr>
            <tr v-if="topLinks.length === 0">
              <td colspan="5" class="p-4 text-center text-slate-400">Belum ada tautan terpopuler.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row-item:hover { background: transparent !important; }
:global(.dark) .row-item { background: #1e293b; color: #94a3b8; transition: none !important; }
:global(.dark) .row-item:hover { background: transparent !important; }
</style>

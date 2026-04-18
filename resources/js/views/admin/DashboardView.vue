<script setup>
import { ref, onMounted, computed } from 'vue'
import { downloadFile } from '@/lib/download'
import api from '@/services/api' 
import SIGAPIcons from '@/components/SIGAPIcons.vue'

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

const downloadRecap = async () => {
  const dateStr = new Date().toISOString().split('T')[0]
  try {
    await downloadFile(`/admin/dashboard/export`, `rekap-data-sigap-${dateStr}.csv`)
  } catch (error) {
    alert('Gagal mengunduh rekap data.')
  }
}

const maxClick = computed(() => {
  if (rawChartData.value.length === 0) return 0
  return Math.max(...rawChartData.value.map(item => item.stats.total))
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-8 animate-fadeup">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Dashboard Utama</h1>
        <p class="text-sm text-slate-500 font-medium">Monitoring performa dan aktivitas portal tautan.</p>
      </div>
      <button 
        @click="downloadRecap" 
        class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 font-bold text-xs uppercase tracking-wider self-start"
      >
        <SIGAPIcons name="Download" :size="16" />
        Ekspor Data (CSV)
      </button>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(val, key) in {
        'Total Tautan': { v: stats.totalLinks, i: 'Link', c: 'text-[#4f86e8]', bg: 'bg-blue-50' },
        'Kategori': { v: stats.totalCategories, i: 'Layers', c: 'text-indigo-500', bg: 'bg-indigo-50' },
        'Total Klik': { v: stats.totalClicks, i: 'MousePointer2', c: 'text-emerald-500', bg: 'bg-emerald-50' },
        'Engagement': { v: stats.totalEngagement + '%', i: 'Sparkles', c: 'text-violet-500', bg: 'bg-violet-50' }
      }" :key="key" class="bg-white p-6 rounded-[2rem] border-2 border-white shadow-xl shadow-slate-200/50 flex items-center gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
        <div class="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div :class="[val.bg, val.c]" class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6 shadow-sm border border-white/50 shrink-0">
          <SIGAPIcons :name="val.i" :size="28" />
        </div>
        <div class="relative z-10">
          <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{{ key }}</p>
          <h3 class="text-3xl font-black text-slate-800 tracking-tight">{{ val.v }}</h3>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-2 border-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-20"></div>
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 relative z-10">
        <div>
          <h3 class="font-black text-xl text-slate-800">Visualisasi Aktivitas Tautan</h3>
          <p class="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Berdasarkan jumlah klik per periode.</p>
        </div>
        <div class="flex gap-3 w-full md:w-auto">
          <select v-model="filterMonth" @change="fetchData" class="flex-1 md:flex-none text-xs font-black border-2 border-slate-100 rounded-2xl px-5 py-3 bg-slate-50 text-slate-600 outline-none focus:border-blue-300 transition-all cursor-pointer">
            <option value="all">Semua Bulan</option>
            <option v-for="(m, i) in ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']" :key="m" :value="i+1">{{ m }}</option>
          </select>
          <select v-model="filterYear" @change="fetchData" class="flex-1 md:flex-none text-xs font-black border-2 border-slate-100 rounded-2xl px-5 py-3 bg-slate-50 text-slate-600 outline-none focus:border-blue-300 transition-all cursor-pointer">
            <option v-for="y in yearsList" :key="y" :value="y.toString()">{{ y }}</option>
          </select>
        </div>
      </div>

      <div class="relative min-h-[300px] flex flex-col justify-end">
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <div class="w-9 h-9 border-3 border-[#4f86e8] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-if="rawChartData.length > 0" class="flex items-end gap-2 md:gap-4 h-64 w-full">
          <div v-for="item in rawChartData" :key="item.id" class="flex-1 flex flex-col items-center group relative h-full justify-end">
            <!-- Tooltip info on hover -->
            <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity z-20 pointer-events-none">
               <div class="bg-slate-800 text-white text-[10px] py-2 px-4 rounded-lg shadow-xl whitespace-nowrap">
                  <span class="font-bold text-blue-300">{{ item.stats.total }} Klik</span> <br/>
                  <span class="text-[9px] opacity-90">{{ item.title }}</span> <br/>
                  <span v-if="item.category" class="text-[8px] text-amber-300/80">📂 {{ item.category }}</span>
                  <div class="flex gap-3 mt-1 border-t border-white/10 pt-1">
                    <span class="text-[8px] text-blue-400">👤 User: {{ item.stats.user }}</span>
                    <span class="text-[8px] text-amber-400">🌐 Guest: {{ item.stats.guest }}</span>
                  </div>
               </div>
               <div class="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1"></div>
            </div>

          <!-- Segmented Bar -->
          <div class="w-full max-w-[40px] flex flex-col-reverse rounded-t-xl overflow-hidden transition-all group-hover:scale-x-110 shadow-sm"
                 :style="{ height: `${(item.stats.total / maxClick) * 100}%` }">
              <div class="bg-[#4f86e8] w-full" :style="{ height: `${(item.stats.user / item.stats.total) * 100}%` }"></div>
              <div class="bg-amber-300 w-full" :style="{ height: `${(item.stats.guest / item.stats.total) * 100}%` }"></div>
          </div>

          <p class="text-[9px] font-semibold text-slate-300 mt-3 rotate-45 origin-left whitespace-nowrap opacity-100 transition-opacity">
            {{ item.title.substring(0, 10) }}..
          </p>
        </div>
      </div>

      <div v-else-if="!isLoading" class="flex flex-col h-full items-center justify-center text-slate-200 py-20 gap-3">
        <SIGAPIcons name="Inbox" :size="48" class="opacity-20" />
        <p class="text-xs font-bold uppercase tracking-widest">Data belum tersedia untuk periode ini</p>
      </div>

      <!-- Legend -->
      <div class="mt-16 flex justify-center gap-8 border-t border-slate-100 pt-8">
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 bg-[#4f86e8] rounded-lg shadow-sm"></div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login User</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 bg-amber-300 rounded-lg shadow-sm"></div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengunjung</span>
        </div>
      </div>
    </div>
  </div>

    <!-- Table Section -->
    <div class="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-2 border-white overflow-hidden">
      <div class="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 class="font-black text-xl text-slate-800">Top 10 Tautan Terpopuler</h3>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Layanan dengan tingkat interaksi tertinggi.</p>
        </div>
        <span class="text-[10px] font-black text-white px-4 py-2 bg-blue-600 rounded-full tracking-widest uppercase shadow-lg shadow-blue-200">Live Stats</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400 font-black text-[10px] uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
              <th class="px-8 py-6 w-16 text-center">Rank</th>
              <th class="px-6 py-6 font-black">Informasi Tautan</th>
              <th class="px-6 py-6 font-black">Kategori</th>
              <th class="px-6 py-6 text-center font-black">Interaksi</th>
              <th class="px-8 py-6 text-center font-black">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(link, index) in topLinks" :key="link.id" class="hover:bg-blue-50/40 transition-colors group">
              <td class="px-8 py-6 text-center">
                <span class="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-300">
                  {{ index + 1 }}
                </span>
              </td>
              <td class="px-6 py-6">
                <div class="font-black text-sm text-slate-800 leading-tight mb-1">{{ link.title_id || link.title }}</div>
                <div class="text-[11px] text-slate-400 font-bold truncate max-w-xs opacity-70 group-hover:text-blue-500 transition-colors">{{ link.url }}</div>
              </td>
              <td class="px-6 py-6">
                <span class="text-[10px] font-black text-slate-500 bg-slate-100 border-2 border-white shadow-sm px-4 py-1.5 rounded-xl uppercase tracking-tighter">
                  {{ link.category?.name || link.category?.name_id || 'Umum' }}
                </span>
              </td>
              <td class="px-6 py-6 text-center">
                <div class="flex flex-col items-center">
                  <span class="text-base font-black text-slate-800">{{ link.clicks }}</span>
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klik</span>
                </div>
              </td>
              <td class="px-8 py-6 text-center">
                <span v-if="link.is_active" class="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">Aktif</span>
                <span v-else class="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200">Arsip</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup {
  animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeup {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

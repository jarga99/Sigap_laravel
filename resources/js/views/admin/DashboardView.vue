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
        'Total Tautan': { v: stats.totalLinks, i: 'Link', c: 'text-blue-600', bg: 'bg-blue-50' },
        'Kategori': { v: stats.totalCategories, i: 'Layers', c: 'text-indigo-600', bg: 'bg-indigo-50' },
        'Total Klik': { v: stats.totalClicks, i: 'MousePointer2', c: 'text-emerald-600', bg: 'bg-emerald-50' },
        'Engagement': { v: stats.totalEngagement + '%', i: 'Sparkles', c: 'text-purple-600', bg: 'bg-purple-50' }
      }" :key="key" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
        <div :class="[val.bg, val.c]" class="p-4 rounded-2xl transition-transform group-hover:scale-110">
          <SIGAPIcons :name="val.i" :size="28" />
        </div>
        <div>
          <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{{ key }}</p>
          <h3 class="text-2xl font-black text-slate-800">{{ val.v }}</h3>
        </div>
      </div>
    </div>

    <!-- Charts Section (Custom SVG Bar Chart) -->
    <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h3 class="font-black text-lg text-slate-800">Visualisasi Aktivitas Tautan</h3>
          <p class="text-xs text-slate-400 font-medium">Berdasarkan jumlah klik per periode.</p>
        </div>
        <div class="flex gap-2 w-full md:w-auto">
          <select v-model="filterMonth" @change="fetchData" class="flex-1 md:flex-none text-xs font-bold border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            <option value="all">Semua Bulan</option>
            <option v-for="(m, i) in ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']" :key="m" :value="i+1">{{ m }}</option>
          </select>
          <select v-model="filterYear" @change="fetchData" class="flex-1 md:flex-none text-xs font-bold border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            <option v-for="y in yearsList" :key="y" :value="y.toString()">{{ y }}</option>
          </select>
        </div>
      </div>
      
      <div class="relative min-h-[300px] flex flex-col justify-end">
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/60 z-10 backdrop-blur-[2px]">
          <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-if="rawChartData.length > 0" class="flex items-end gap-2 md:gap-4 h-64 w-full">
          <div v-for="item in rawChartData" :key="item.id" class="flex-1 flex flex-col items-center group relative h-full justify-end">
            <!-- Tooltip info on hover -->
            <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
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

            <!-- Segmented Progress Bar (Stacked) -->
            <div class="w-full max-w-[40px] flex flex-col-reverse rounded-t-lg overflow-hidden transition-all group-hover:scale-x-110 shadow-sm"
                 :style="{ height: `${(item.stats.total / maxClick) * 100}%` }">
               <div class="bg-blue-600 w-full" :style="{ height: `${(item.stats.user / item.stats.total) * 100}%` }" title="User"></div>
               <div class="bg-amber-400 w-full" :style="{ height: `${(item.stats.guest / item.stats.total) * 100}%` }" title="Guest"></div>
            </div>
            
            <p class="text-[9px] font-bold text-slate-400 mt-3 rotate-45 origin-left whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {{ item.title.substring(0, 10) }}..
            </p>
          </div>
        </div>
        
        <div v-else-if="!isLoading" class="flex flex-col h-full items-center justify-center text-slate-300 py-20 gap-3">
          <SIGAPIcons name="Inbox" :size="48" class="opacity-20" />
          <p class="text-xs font-bold uppercase tracking-widest italic">Data belum tersedia untuk periode ini</p>
        </div>

        <!-- Legend -->
        <div class="mt-16 flex justify-center gap-6 border-t border-slate-50 pt-6">
           <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-600 rounded-sm"></div>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Login User</span>
           </div>
           <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-amber-400 rounded-sm"></div>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Guest (Publik)</span>
           </div>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
        <h3 class="font-black text-lg text-slate-800">Top 10 Tautan Terpopuler</h3>
        <span class="text-[10px] font-black text-blue-600 px-3 py-1 bg-blue-50 rounded-full tracking-tighter uppercase">Live Stats</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
              <th class="px-8 py-5 w-16 text-center">Rank</th>
              <th class="px-4 py-5">Informasi Tautan</th>
              <th class="px-4 py-5">Kategori</th>
              <th class="px-4 py-5 text-center">Interaksi</th>
              <th class="px-8 py-5 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="(link, index) in topLinks" :key="link.id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-8 py-5 text-center">
                <span class="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {{ index + 1 }}
                </span>
              </td>
              <td class="px-4 py-5">
                <div class="font-black text-sm text-slate-700 leading-tight mb-0.5">{{ link.title_id || link.title }}</div>
                <div class="text-[10px] text-slate-400 font-medium truncate max-w-xs opacity-60">{{link.url}}</div>
              </td>
              <td class="px-4 py-5">
                <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {{ link.category?.name || link.category?.name_id || 'Umum' }}
                </span>
              </td>
              <td class="px-4 py-5 text-center">
                <div class="flex flex-col items-center">
                   <span class="text-sm font-black text-slate-700">{{ link.clicks }}</span>
                   <span class="text-[8px] font-bold text-slate-300 uppercase">Klik</span>
                </div>
              </td>
              <td class="px-8 py-5 text-center">
                <span v-if="link.is_active" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border border-emerald-100">Aktif</span>
                <span v-else class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-slate-50 text-slate-400">Arsip</span>
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

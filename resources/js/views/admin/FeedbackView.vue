<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const feedbacks = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/feedback')
    feedbacks.value = res.data
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const filteredFeedbacks = computed(() => {
  if (!searchQuery.value) return feedbacks.value
  const q = searchQuery.value.toLowerCase()
  return feedbacks.value.filter(f => 
    f.name?.toLowerCase().includes(q) || 
    f.message?.toLowerCase().includes(q) || 
    f.category?.toLowerCase().includes(q)
  )
})

const deleteFeedback = async (id: number) => {
  if (!confirm('Hapus laporan ini?')) return
  try { await api.delete(`/admin/feedback/${id}`); fetchFeedbacks() }
  catch (err) { alert('Gagal menghapus') }
}

onMounted(fetchFeedbacks)
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Laporan & Feedback</h1>
        <p class="text-sm text-slate-500 font-medium">Pantau keluhan dan saran dari pengunjung portal.</p>
      </div>
      <button @click="fetchFeedbacks" class="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
         <SIGAPIcons name="RefreshCcw" :size="20" />
      </button>
    </div>

    <!-- Search Tool -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
      <div class="relative w-full lg:max-w-md">
        <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="searchQuery" type="text" placeholder="Cari nama atau pesan laporan..." class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>
    </div>

    <!-- Feedback Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-if="isLoading" v-for="i in 4" :key="i" class="h-48 bg-white border border-slate-100 rounded-3xl animate-pulse"></div>
      
      <div v-else v-for="fb in filteredFeedbacks" :key="fb.id" class="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col">
         <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
               <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <SIGAPIcons name="MessageSquare" :size="20" />
               </div>
               <div>
                  <h3 class="font-black text-slate-800 text-sm tracking-tight capitalize">{{ fb.name || 'Anonim' }}</h3>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ new Date(fb.createdAt).toLocaleDateString('id-ID') }}</p>
               </div>
            </div>
            <button @click="deleteFeedback(fb.id)" class="p-2.5 bg-slate-50 text-slate-300 hover:bg-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100">
               <SIGAPIcons name="Trash2" :size="16" />
            </button>
         </div>
         
         <div class="flex-1 bg-slate-50 p-5 rounded-2xl mb-6">
            <p class="text-xs text-slate-600 font-medium leading-relaxed italic">"{{ fb.message }}"</p>
         </div>

         <div class="flex items-center justify-between">
            <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-tighter border border-black/5">{{ fb.category || 'General' }}</span>
            <span class="text-[10px] font-mono text-slate-300">{{ fb.email || '-' }}</span>
         </div>
      </div>

      <div v-if="!isLoading && filteredFeedbacks.length === 0" class="col-span-full py-20 text-center">
         <SIGAPIcons name="Inbox" :size="64" class="mx-auto text-slate-100 mb-4" />
         <p class="text-xs font-black text-slate-300 uppercase tracking-widest">Tidak ada laporan masuk</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

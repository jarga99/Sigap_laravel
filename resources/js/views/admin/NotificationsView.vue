<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import { useRouter } from 'vue-router'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const router = useRouter()
const notifications = ref<any[]>([])
const isLoading = ref(true)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  total: 0
})

const fetchNotifications = async (page = 1) => {
  isLoading.value = true
  try {
    const res = await api.get(`/notifications?all=true&page=${page}`)
    notifications.value = res.data.data
    pagination.value = {
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      total: res.data.total
    }
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const goToNotification = async (notif: any) => {
  try {
    await api.put(`/notifications/${notif.id}/read`)
    if (notif.link) {
      router.push(notif.link)
    } else {
      fetchNotifications(pagination.value.current_page)
    }
  } catch (err) { console.error(err) }
}

const markAllRead = async () => {
  if (!confirm('Tandai semua sebagai sudah dibaca?')) return
  try {
    await api.post('/notifications/read')
    fetchNotifications(1)
  } catch (err) { console.error(err) }
}

onMounted(() => fetchNotifications())
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">Riwayat Notifikasi</h1>
        <p class="text-sm text-slate-400 font-semibold flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-[#4f86e8]"></span>
           Daftar lengkap semua pemberitahuan sistem anda
        </p>
      </div>
      <div class="flex gap-4">
        <button @click="markAllRead" class="px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
           <SIGAPIcons name="CheckCheck" :size="16" />
           Tandai Semua Dibaca
        </button>
        <button @click="fetchNotifications(1)" class="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-[#4f86e8] transition-all shadow-sm active:scale-95">
           <SIGAPIcons name="RefreshCcw" :size="20" />
        </button>
      </div>
    </div>

    <!-- Notification List -->
    <div class="bg-white rounded-[3rem] border border-blue-50 shadow-sm overflow-hidden">
       <div v-if="isLoading" class="p-20 text-center space-y-4">
          <div class="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p class="text-slate-400 font-bold text-sm">Memuat riwayat...</p>
       </div>

       <div v-else-if="notifications.length === 0" class="p-20 text-center">
          <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <SIGAPIcons name="BellOff" :size="48" class="text-slate-200" />
          </div>
          <p class="text-lg font-bold text-slate-700">Belum ada notifikasi</p>
          <p class="text-sm text-slate-400">Aktivitas sistem akan muncul di sini.</p>
       </div>

       <div v-else>
          <div v-for="notif in notifications" :key="notif.id" 
             @click="goToNotification(notif)"
             class="group p-8 border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center gap-6">
             
             <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all" 
                :class="!notif.isRead ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-400'">
                <SIGAPIcons :name="notif.type === 'FEEDBACK' ? 'MessageSquare' : 'Bell'" :size="20" />
             </div>

             <div class="flex-1">
                <p class="text-sm font-bold transition-colors" :class="!notif.isRead ? 'text-slate-800' : 'text-slate-400'">
                   {{ notif.message }}
                </p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                   {{ new Date(notif.created_at).toLocaleString('id-ID') }}
                </p>
             </div>

             <div v-if="!notif.isRead" class="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
             
             <div class="opacity-0 group-hover:opacity-100 transition-all">
                <SIGAPIcons name="ChevronRight" :size="16" class="text-blue-500" />
             </div>
          </div>

          <!-- Pagination -->
          <div v-if="pagination.last_page > 1" class="p-8 bg-slate-50/50 flex items-center justify-center gap-2">
             <button 
                v-for="page in pagination.last_page" :key="page"
                @click="fetchNotifications(page)"
                class="w-10 h-10 rounded-xl font-bold text-xs transition-all"
                :class="pagination.current_page === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 hover:bg-white/80 border border-slate-200'"
             >
                {{ page }}
             </button>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

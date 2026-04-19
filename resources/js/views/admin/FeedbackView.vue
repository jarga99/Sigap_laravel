<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const isAdmin = computed(() => user.value?.role === 'ADMIN')

const feedbacks = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const showReplyModal = ref(false)
const selectedFeedback = ref<any>(null)
const isReplying = ref(false)
const showImageZoom = ref(false)
const zoomImageUrl = ref('')

const replyForm = ref({
  reply_message: '',
  file: null as File | null
})
const replyImagePreview = ref('')

const pagination = ref({
  current_page: 1,
  last_page: 1,
  total: 0
})

const fetchFeedbacks = async (page = 1) => {
  isLoading.value = true
  try {
    const res = await api.get(`/admin/feedback?page=${page}`)
    feedbacks.value = res.data.data
    pagination.value = {
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      total: res.data.total
    }
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const stats = computed(() => {
  return {
    total: feedbacks.value.length,
    unread: feedbacks.value.filter(f => !f.is_read).length,
    replied: feedbacks.value.filter(f => f.status === 'DONE').length
  }
})

const filteredFeedbacks = computed(() => {
  let list = feedbacks.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(f => 
      f.name?.toLowerCase().includes(q) || 
      f.comment?.toLowerCase().includes(q) || 
      f.category?.toLowerCase().includes(q)
    )
  }
  return list
})

const deleteFeedback = async (id: number) => {
  if (!confirm('Hapus laporan ini?')) return
  try { await api.delete(`/admin/feedback/${id}`); fetchFeedbacks() }
  catch (err) { alert('Gagal menghapus') }
}

const openReplyModal = (fb: any) => {
  selectedFeedback.value = fb
  replyForm.value = { reply_message: fb.reply_message || '', file: null }
  replyImagePreview.value = ''
  showReplyModal.value = true
  
  if (!fb.is_read && isAdmin.value) {
    toggleRead(fb.id)
  }
}

const toggleRead = async (id: number) => {
  try {
    await api.put(`/admin/feedback/${id}/read`)
    const fb = feedbacks.value.find(f => f.id === id)
    if (fb) fb.is_read = !fb.is_read
  } catch (err) { console.error(err) }
}

const handleFileUpload = (e: any) => {
  const file = e.target.files[0]
  if (!file) return
  replyForm.value.file = file
  replyImagePreview.value = URL.createObjectURL(file)
}

const submitReply = async () => {
  if (!replyForm.value.reply_message) return
  isReplying.value = true
  
  const fd = new FormData()
  fd.append('reply_message', replyForm.value.reply_message)
  if (replyForm.value.file) {
    fd.append('file', replyForm.value.file)
  }

  try {
    await api.post(`/admin/feedback/${selectedFeedback.value.id}/reply`, fd)
    showReplyModal.value = false
    replyImagePreview.value = ''
    fetchFeedbacks()
  } catch (err) { alert('Gagal membalas laporan') }
  finally { isReplying.value = false }
}

const zoomImage = (url: string) => {
  zoomImageUrl.value = url
  showImageZoom.value = true
}

const getImageUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/${path.replace(/^\//, '')}` 
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(fetchFeedbacks)
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black text-slate-800 tracking-tighter uppercase">
          {{ isAdmin ? 'Manajemen Kotak Saran' : 'Riwayat Saran Saya' }}
        </h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
           <span class="w-2 h-2 rounded-full" :class="isAdmin ? 'bg-blue-600' : 'bg-emerald-500'"></span>
           {{ isAdmin ? 'Pantau keluhan dan masukan dari seluruh pengguna portal' : 'Saran dan aspirasi anda yang telah dikirimkan ke administrator' }}
        </p>
      </div>
      <button @click="fetchFeedbacks" class="group p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
         <SIGAPIcons name="RefreshCcw" :size="20" class="group-hover:rotate-180 transition-transform duration-500" />
      </button>
    </div>

    <!-- Stats Summary Cards (Only for Admin) -->
    <div v-if="isAdmin" class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <SIGAPIcons name="Inbox" :size="24" />
         </div>
         <div>
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Masuk</p>
            <h3 class="text-2xl font-black text-slate-800">{{ stats.total }}</h3>
         </div>
      </div>
      <div class="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <SIGAPIcons name="Bell" :size="24" />
         </div>
         <div>
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Belum Dibaca</p>
            <h3 class="text-2xl font-black text-slate-800">{{ stats.unread }}</h3>
         </div>
      </div>
      <div class="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <SIGAPIcons name="CheckCircle" :size="24" />
         </div>
         <div>
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Sudah Selesai</p>
            <h3 class="text-2xl font-black text-slate-800">{{ stats.replied }}</h3>
         </div>
      </div>
    </div>

    <!-- Search Box -->
    <div class="max-w-xl relative group">
       <SIGAPIcons name="Search" :size="20" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
       <input v-model="searchQuery" type="text" :placeholder="isAdmin ? 'Cari nama, pesan, atau kategori...' : 'Cari riwayat pesan anda...'" 
              class="w-full bg-white border-2 border-slate-100 rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" />
    </div>

    <!-- Compact List -->
    <div class="grid grid-cols-1 gap-6">
      <div v-if="isLoading" v-for="i in 3" :key="i" class="h-48 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse"></div>
      
      <div v-else-if="filteredFeedbacks.length > 0" v-for="fb in filteredFeedbacks" :key="fb.id" 
           class="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden">
         <div class="p-8 md:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            <!-- Person / Info Panel (Clipped for User view) -->
            <div class="lg:w-[220px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-50 pb-8 lg:pb-0 lg:pr-8 flex flex-col justify-between">
               <div class="space-y-4">
                  <div class="flex items-center gap-3">
                     <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-inner"
                          :class="fb.status === 'DONE' ? 'bg-emerald-500' : (fb.is_read ? 'bg-slate-300' : 'bg-blue-600')">
                        {{ (fb.name || 'A')[0].toUpperCase() }}
                     </div>
                     <div class="leading-tight">
                        <h4 class="font-black text-slate-800 text-sm tracking-tight">{{ fb.is_anonymous && isAdmin ? 'Identitas Tersembunyi' : (fb.name || 'Anonim') }}</h4>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatDate(fb.createdAt) }}</p>
                     </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                     <span class="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-wider border border-slate-100">{{ fb.category || 'UMUM' }}</span>
                     <span v-if="!fb.is_read && isAdmin" class="px-3 py-1 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm shadow-blue-500/20">BARU</span>
                     <span v-if="fb.status === 'DONE'" class="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm shadow-emerald-500/20">SELESAI</span>
                  </div>
               </div>

               <div v-if="fb.attachment_url" class="mt-6 pt-6 border-t border-slate-50">
                  <p class="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Lampiran Bukti:</p>
                  <div @click="zoomImage(getImageUrl(fb.attachment_url))" class="relative group/att bg-slate-50 rounded-xl overflow-hidden aspect-video border border-slate-100 cursor-zoom-in">
                     <img :src="getImageUrl(fb.attachment_url)" class="w-full h-full object-cover transition-transform duration-500 group-hover/att:scale-110" />
                     <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/att:opacity-100 transition-all flex items-center justify-center">
                        <SIGAPIcons name="Maximize" :size="16" class="text-white" />
                     </div>
                  </div>
               </div>
            </div>

            <!-- Content Panel -->
            <div class="flex-1 flex flex-col justify-between space-y-8">
               <div class="space-y-6">
                  <!-- User Message -->
                  <div class="relative pl-6 border-l-4 border-blue-50">
                     <div class="absolute -left-[14px] top-0 bg-white p-1 rounded-full"><SIGAPIcons name="Quote" :size="16" class="text-blue-100 rotate-180" /></div>
                     <p class="text-slate-600 font-medium italic text-lg leading-relaxed">"{{ fb.comment }}"</p>
                  </div>

                  <!-- Admin Response -->
                  <div v-if="fb.reply_message" class="mt-6 p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50 relative">
                     <div class="flex items-center gap-2 mb-3">
                        <div class="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center"><SIGAPIcons name="ShieldCheck" :size="14" /></div>
                        <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tanggapan Administrator</span>
                        <span class="text-[9px] text-slate-400 font-bold ml-auto">{{ formatDate(fb.replied_at) }}</span>
                     </div>
                     <p class="text-slate-700 text-sm font-bold leading-relaxed line-clamp-4">{{ fb.reply_message }}</p>
                     
                     <div v-if="fb.reply_image_url" class="mt-4 pt-4 border-t border-emerald-100/30">
                        <div @click="zoomImage(getImageUrl(fb.reply_image_url))" class="w-32 rounded-lg overflow-hidden border border-emerald-100 cursor-zoom-in group/rep">
                           <img :src="getImageUrl(fb.reply_image_url)" class="w-full h-auto" />
                        </div>
                     </div>
                  </div>
                  <div v-else-if="!isAdmin" class="flex items-center gap-3 text-slate-300 italic">
                     <SIGAPIcons name="Clock" :size="14" />
                     <span class="text-[10px] font-bold uppercase tracking-widest">Menunggu tanggapan administrator...</span>
                  </div>
               </div>

               <!-- Actions -->
               <div class="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div class="flex gap-3">
                     <button v-if="isAdmin" @click="openReplyModal(fb)" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                        <SIGAPIcons :name="fb.status === 'DONE' ? 'Edit2' : 'MessageSquare'" :size="14" />
                        {{ fb.status === 'DONE' ? 'Edit Balasan' : 'Balas Sekarang' }}
                     </button>
                     <button v-if="isAdmin" @click="toggleRead(fb.id)" class="px-6 py-2.5 bg-white border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        {{ fb.is_read ? 'Belum Selesai' : 'Tandai Selesai' }}
                     </button>
                  </div>
                  <button v-if="isAdmin" @click="deleteFeedback(fb.id)" class="p-3 text-slate-200 hover:text-red-500 transition-colors">
                     <SIGAPIcons name="Trash2" :size="20" />
                  </button>
               </div>
            </div>
         </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.last_page > 1" class="px-8 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Menampilkan <span class="text-slate-800">{{ feedbacks.length }}</span> dari <span class="text-slate-800">{{ pagination.total }}</span> data
        </p>
        <div class="flex items-center gap-3">
          <button @click="fetchFeedbacks(pagination.current_page - 1)" :disabled="pagination.current_page === 1" class="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 disabled:opacity-30 hover:border-blue-200 transition-all uppercase tracking-widest shadow-lg shadow-slate-200/50 active:scale-90">Prev</button>
          <div class="flex items-center gap-2">
             <span class="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-200">{{ pagination.current_page }}</span>
             <span class="text-[10px] font-black text-slate-300">/ {{ pagination.last_page }}</span>
          </div>
          <button @click="fetchFeedbacks(pagination.current_page + 1)" :disabled="pagination.current_page === pagination.last_page" class="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 disabled:opacity-30 hover:border-blue-200 transition-all uppercase tracking-widest shadow-lg shadow-slate-200/50 active:scale-90">Next</button>
        </div>
      </div>
    </div>

    <!-- Reply Modal -->
    <Teleport to="body">
       <div v-if="showReplyModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showReplyModal = false"></div>
          <div class="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-fadeup border border-slate-100">
             <div class="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 class="font-black text-slate-800 text-2xl tracking-tighter uppercase">Tanggapan Admin</h3>
                  <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Berikan solusi atau penjelasan untuk laporan ini</p>
                </div>
                <button @click="showReplyModal = false" class="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-500 transition-all">
                   <SIGAPIcons name="X" :size="24" />
                </button>
             </div>
             
             <div class="p-10 space-y-8">
                <div class="space-y-3">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black flex items-center gap-2 ml-1">
                      <SIGAPIcons name="MessageSquare" :size="12" /> Isi Balasan
                   </label>
                   <textarea v-model="replyForm.reply_message" rows="5" placeholder="Tuliskan respon resmi administrator di sini..." 
                             class="w-full bg-[#f4f8ff] rounded-2xl p-6 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all resize-none dark:text-slate-800 shadow-inner"></textarea>
                </div>

                <div class="space-y-3">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black flex items-center gap-2 ml-1">
                       <SIGAPIcons name="Image" :size="12" /> Bukti Penyelesaian (Opsional)
                   </label>
                   
                   <div v-if="replyImagePreview" class="relative w-full aspect-video bg-blue-50 rounded-[2rem] overflow-hidden mb-3 border-2 border-blue-100 group shadow-lg">
                      <img :src="replyImagePreview" class="w-full h-full object-cover" />
                      <button @click="replyForm.file = null; replyImagePreview = ''" class="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                         <SIGAPIcons name="Trash2" :size="20" />
                      </button>
                   </div>
                   
                   <div v-else class="relative h-32 w-full border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-blue-400 transition-all group overflow-hidden bg-slate-50 flex items-center justify-center">
                      <input type="file" @change="handleFileUpload" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div class="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500">
                         <SIGAPIcons name="UploadCloud" :size="32" />
                         <span class="text-[9px] font-black uppercase tracking-widest">Pilih Gambar Bukti</span>
                      </div>
                   </div>
                </div>

                <button @click="submitReply" :disabled="isReplying || !replyForm.reply_message" 
                        class="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                   <span v-if="!isReplying">Kirim & Tandai Selesai</span>
                   <span v-else class="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                </button>
             </div>
          </div>
       </div>
    </Teleport>

    <!-- Image Zoom -->
    <Teleport to="body">
       <Transition name="fade">
          <div v-if="showImageZoom" class="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-slate-900/95 backdrop-blur-2xl" @click="showImageZoom = false">
             <img :src="zoomImageUrl" class="max-w-full max-h-full rounded-[2rem] shadow-2xl animate-fadeup" />
             <button class="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md">
                <SIGAPIcons name="X" :size="24" />
             </button>
          </div>
       </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

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

const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/feedback')
    feedbacks.value = res.data
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
  showReplyModal.value = true
  
  if (!fb.is_read) {
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
  replyForm.value.file = e.target.files[0]
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
  return `/${path}` // Assuming public path
}

onMounted(fetchFeedbacks)
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">Kotak Saran & Laporan</h1>
        <p class="text-sm text-slate-400 font-semibold flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
           Pantau keluhan dan saran dari pengunjung portal anda
        </p>
      </div>
      <button @click="fetchFeedbacks" class="group p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95">
         <SIGAPIcons name="RefreshCcw" :size="20" class="group-hover:rotate-180 transition-transform duration-500" />
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div class="bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
            <SIGAPIcons name="MessageSquare" :size="28" />
         </div>
         <div>
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Laporan</p>
            <h3 class="text-3xl font-bold text-slate-800">{{ stats.total }}</h3>
         </div>
      </div>
      <div class="bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center">
            <SIGAPIcons name="Bell" :size="28" />
         </div>
         <div>
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Belum Dibaca</p>
            <h3 class="text-3xl font-bold text-slate-800">{{ stats.unread }}</h3>
         </div>
      </div>
      <div class="bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-sm flex items-center gap-6">
         <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
            <SIGAPIcons name="CheckCircle" :size="28" />
         </div>
         <div>
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Sudah Dibalas</p>
            <h3 class="text-3xl font-bold text-slate-800">{{ stats.replied }}</h3>
         </div>
      </div>
    </div>

    <!-- Search Tool -->
    <div class="bg-white/50 p-2 rounded-[2rem] border border-blue-50 shadow-inner flex flex-col md:flex-row gap-4 items-center">
      <div class="relative flex-1 group">
        <SIGAPIcons name="Search" :size="20" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
        <input v-model="searchQuery" type="text" placeholder="Cari nama, pesan, atau kategori laporan..." class="w-full bg-white border-none rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
      </div>
    </div>

    <!-- Feedback List -->
    <div class="grid grid-cols-1 gap-8">
      <div v-if="isLoading" v-for="i in 3" :key="i" class="h-64 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse shadow-sm"></div>
      
      <div v-else v-for="fb in filteredFeedbacks" :key="fb.id" class="group bg-white p-10 rounded-[3rem] border border-blue-50 hover:border-blue-200 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col lg:flex-row gap-10">
         
         <!-- Person Info -->
         <div class="lg:w-1/4 space-y-4">
            <div class="flex items-center gap-4">
               <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20" :class="fb.status === 'DONE' ? 'bg-emerald-500' : 'bg-blue-600'">
                  {{ (fb.name || 'A')[0].toUpperCase() }}
               </div>
               <div>
                 <h3 class="font-bold text-slate-800 text-lg leading-tight">{{ fb.is_anonymous ? 'Anonim' : (fb.name || 'Pengunjung') }}</h3>
                 <p class="text-xs font-bold text-slate-400 uppercase tracking-tighter">{{ new Date(fb.createdAt).toLocaleString('id-ID') }}</p>
               </div>
            </div>
            
            <div class="flex flex-wrap gap-2">
               <span class="px-3 py-1 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-100">{{ fb.category || 'Umum' }}</span>
               <span v-if="fb.is_read" class="px-3 py-1 bg-blue-50 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100">Dibaca</span>
               <span v-if="fb.status === 'DONE'" class="px-3 py-1 bg-emerald-50 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-100">Selesai</span>
            </div>

            <div v-if="fb.attachment_url" class="pt-4">
               <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Lampiran Bukti:</p>
               <div @click="zoomImage(getImageUrl(fb.attachment_url))" class="relative w-full aspect-video bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 cursor-zoom-in group/img">
                  <img :src="getImageUrl(fb.attachment_url)" class="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                  <div class="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 flex items-center justify-center transition-all opacity-0 group-hover/img:opacity-100">
                     <SIGAPIcons name="Maximize" :size="24" class="text-white" />
                  </div>
               </div>
            </div>
         </div>

         <!-- Message & Reply Content -->
         <div class="flex-1 flex flex-col justify-between">
            <div class="space-y-6">
               <div class="bg-blue-50/30 p-8 rounded-[2.5rem] relative">
                  <!-- Quote mark -->
                  <div class="absolute -top-4 -left-2 text-blue-100">
                     <SIGAPIcons name="Quote" :size="48" style="transform: rotate(180deg);" />
                  </div>
                  <p class="text-slate-600 font-medium leading-relaxed italic relative z-10 text-lg">
                     {{ fb.comment }}
                  </p>
                  <div v-if="fb.rating" class="mt-4 flex gap-1">
                     <SIGAPIcons v-for="i in 5" :key="i" name="Star" :size="14" :class="i <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'" />
                  </div>
               </div>

               <!-- Admin Reply -->
               <div v-if="fb.reply_message" class="bg-emerald-50/30 p-8 rounded-[2.5rem] border-2 border-dashed border-emerald-100 space-y-4">
                  <div class="flex items-center gap-2 text-emerald-600">
                     <SIGAPIcons name="User" :size="14" />
                     <span class="text-[10px] font-black uppercase tracking-widest">Balasan Admin:</span>
                  </div>
                  <p class="text-slate-600 font-semibold text-sm leading-relaxed">
                     {{ fb.reply_message }}
                  </p>
                  <div v-if="fb.reply_image_url" class="w-32 aspect-video rounded-xl overflow-hidden border border-emerald-100 cursor-zoom-in" @click="zoomImage(getImageUrl(fb.reply_image_url))">
                     <img :src="getImageUrl(fb.reply_image_url)" class="w-full h-full object-cover" />
                  </div>
               </div>
            </div>

            <div class="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
               <div class="flex gap-4">
                  <button @click="openReplyModal(fb)" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                     <SIGAPIcons :name="fb.status === 'DONE' ? 'Edit2' : 'MessageSquare'" :size="14" />
                     {{ fb.status === 'DONE' ? 'Edit Balasan' : 'Balas Pesan' }}
                  </button>
                  <button @click="toggleRead(fb.id)" class="px-6 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                     {{ fb.is_read ? 'Tandai Belum Baca' : 'Sudah Dibaca' }}
                  </button>
               </div>
               <button @click="deleteFeedback(fb.id)" class="p-3 text-slate-300 hover:text-red-500 transition-colors">
                  <SIGAPIcons name="Trash2" :size="20" />
               </button>
            </div>
         </div>
      </div>

      <div v-if="!isLoading && filteredFeedbacks.length === 0" class="col-span-full py-20 text-center">
         <div class="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <SIGAPIcons name="Mail" :size="64" class="text-blue-100" />
         </div>
         <p class="text-xl font-bold text-slate-700 mb-2">Kotak saran masih kosong</p>
         <p class="text-sm text-slate-400 font-medium">Laporan yang dikirim pengunjung akan muncul di sini.</p>
      </div>
    </div>

    <!-- Reply Modal -->
    <Teleport to="body">
       <div v-if="showReplyModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showReplyModal = false"></div>
          <div class="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-pop">
             <div class="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-slate-800 text-2xl tracking-tight mb-1">Balas Laporan</h3>
                  <p class="text-sm text-slate-400 font-medium">Kirim penjelasan atau solusi untuk laporan ini</p>
                </div>
                <button @click="showReplyModal = false" class="text-slate-300 hover:text-slate-500 transition-colors">
                   <SIGAPIcons name="X" :size="24" />
                </button>
             </div>
             
             <div class="p-10 space-y-8">
                <div class="space-y-3">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black flex items-center gap-2">
                      <SIGAPIcons name="MessageSquare" :size="10" /> Pesan Balasan
                   </label>
                   <textarea v-model="replyForm.reply_message" rows="5" placeholder="Tuliskan respon atau penyelesaian masalah..." class="w-full bg-slate-50 rounded-2xl p-6 text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all resize-none"></textarea>
                </div>

                <div class="space-y-3">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest font-black flex items-center gap-2">
                       <SIGAPIcons name="Image" :size="10" /> Lampiran Bukti (Opsional)
                   </label>
                   <input type="file" @change="handleFileUpload" class="w-full text-xs font-bold text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer" />
                </div>

                <div class="flex gap-4 pt-6">
                   <button @click="submitReply" :disabled="isReplying" class="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                      <span v-if="!isReplying">Kirim Balasan</span>
                      <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   </button>
                </div>
             </div>
          </div>
       </div>
    </Teleport>

    <!-- Image Zoom -->
    <Teleport to="body">
       <div v-if="showImageZoom" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-fadeup" @click="showImageZoom = false">
          <img :src="zoomImageUrl" class="max-w-full max-h-full rounded-2xl shadow-2xl transition-transform duration-500 hover:scale-105" />
          <button class="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
             <SIGAPIcons name="X" :size="32" />
          </button>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-pop { animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

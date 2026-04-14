<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/auth'
import { 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  Clock, 
  User, 
  Building,
  Loader2,
  Inbox,
  Image as ImageIcon,
  UserX,
  Send,
  CornerDownRight,
  ShieldCheck
} from 'lucide-vue-next'

const feedbacks = ref([])
const isLoading = ref(true)
const replyTexts = ref({}) // Format: { [feedbackId]: 'mesage' }
const replyImages = ref({})
const replyPreviewUrls = ref({})
const isSubmittingReply = ref({})
const authStore = useAuthStore()

const userRole = computed(() => authStore.user?.role || 'EMPLOYEE')
const isAdmin = computed(() => userRole.value === 'ADMIN')

const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/feedback')
    feedbacks.value = res.data
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
  } finally {
    isLoading.value = false
  }
}

const toggleRead = async (feedback) => {
  try {
    await api.put(`/admin/feedback/${feedback.id}`, { isRead: !feedback.isRead })
    feedback.isRead = !feedback.isRead
  } catch (error) {
    alert('Gagal memperbarui status feedback')
  }
}

const deleteFeedback = async (id) => {
  if (!confirm('Apakah Anda yakin ingin menghapus feedback ini?')) return
  try {
    await api.delete(`/admin/feedback/${id}`)
    feedbacks.value = feedbacks.value.filter(f => f.id !== id)
  } catch (error) {
    alert('Gagal menghapus feedback')
  }
}

const handleReplyFileChange = (e, feedbackId) => {
  const file = e.target.files[0]
  if (file) {
    replyImages.value[feedbackId] = file
    replyPreviewUrls.value[feedbackId] = URL.createObjectURL(file)
  }
}

const submitReply = async (feedbackId) => {
  const message = replyTexts.value[feedbackId]
  if (!message || message.trim().length === 0) return

  isSubmittingReply.value[feedbackId] = true
  try {
    let replyImageUrl = null

    if (replyImages.value[feedbackId]) {
      const formData = new FormData()
      formData.append('file', replyImages.value[feedbackId])
      formData.append('type', 'feedback')
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      replyImageUrl = uploadRes.data.url
    }

    const { data } = await api.put(`/admin/feedback/${feedbackId}`, {
      replyMessage: message,
      replyImageUrl: replyImageUrl
    })
    
    // Update local state
    const index = feedbacks.value.findIndex(f => f.id === feedbackId)
    if (index !== -1) {
      feedbacks.value[index] = data.data
    }
    
    replyTexts.value[feedbackId] = ''
    replyImages.value[feedbackId] = null
    replyPreviewUrls.value[feedbackId] = null
    alert('Balasan berhasil dikirim!')
  } catch (err) {
    console.error('Gagal mengirim balasan', err)
    alert('Gagal mengirim balasan. Silakan coba lagi.')
  } finally {
    isSubmittingReply.value[feedbackId] = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const openImage = (url) => {
  if (url) window.open(url, '_blank')
}

onMounted(fetchFeedbacks)
</script>

<template>
  <div class="feedback-page animate-fadeup">
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
      <div>
        <h2 class="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Inbox class="text-blue-500" :size="32" />
          {{ isAdmin ? 'Kotak Saran & Feedback' : 'Riwayat Saran Saya' }}
        </h2>
        <p class="text-slate-500 mt-1">
          {{ isAdmin 
            ? 'Kelola masukan, laporan, dan berikan tanggapan kepada staf.' 
            : 'Pantau status saran dan masukan yang telah Anda kirimkan.' 
          }}
        </p>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Masukan</div>
        <div class="text-3xl font-black text-slate-800 dark:text-slate-100">{{ feedbacks.length }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Belum Dibaca</div>
        <div class="text-3xl font-black text-blue-600 dark:text-blue-400">{{ feedbacks.filter(f => !f.isRead).length }}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sudah Dibalas</div>
        <div class="text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ feedbacks.filter(f => f.replyMessage).length }}</div>
      </div>
    </div>

    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <Loader2 class="animate-spin text-blue-500 mb-4" :size="48" />
      <p class="text-slate-500 font-medium">Memuat pesan...</p>
    </div>

    <div v-else-if="feedbacks.length === 0" class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
      <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
        <MessageSquare class="text-slate-400" :size="40" />
      </div>
      <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200">Tidak ada feedback</h3>
      <p class="text-slate-500 mt-2">
        {{ isAdmin ? 'Belum ada masukan yang dikirimkan oleh pengguna sistem.' : 'Anda belum pernah mengirimkan saran atau masukan.' }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 gap-8">
      <div v-for="item in feedbacks" :key="item.id" 
        class="group relative bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm"
        :class="item.isRead ? 'border-slate-100 dark:border-slate-700 opacity-90' : 'border-blue-200 dark:border-blue-500/30 ring-1 ring-blue-500/10 shadow-lg'"
      >
        <div class="p-6 md:p-8">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-6">
                <span v-if="!item.isRead" class="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Baru</span>
                <span v-if="item.replyMessage" class="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Sudah Dibalas</span>
                <span class="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Clock :size="14" /> {{ formatDate(item.createdAt) }}
                </span>
              </div>
              
              <p class="text-slate-800 dark:text-slate-100 leading-relaxed text-lg font-medium mb-8 whitespace-pre-line italic">
                "{{ item.message }}"
              </p>

              <div v-if="item.imageUrl" class="mb-8">
                <div class="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <ImageIcon :size="14" /> Bukti Melampirkan Gambar
                </div>
                <div class="relative w-full max-w-lg rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 group/img shadow-sm cursor-zoom-in" @click="openImage(item.imageUrl)">
                  <img :src="item.imageUrl" class="w-full h-auto" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center pointer-events-none">
                    <span class="text-white text-xs font-bold px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20">Buka Gambar Penuh</span>
                  </div>
                </div>
              </div>

              <!-- Metadata Staf -->
              <div class="flex flex-wrap items-center gap-8 py-6 border-t border-slate-100 dark:border-slate-700/50">
                <template v-if="item.isAnonymous">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      <UserX :size="20" />
                    </div>
                    <div class="leading-tight">
                      <div class="text-xs font-bold text-slate-500 uppercase tracking-tighter">Identitas</div>
                      <div class="text-sm font-black text-slate-400">ANONIM</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                      {{ item.user?.username?.charAt(0) || 'U' }}
                    </div>
                    <div class="leading-tight">
                      <div class="text-xs font-bold text-slate-400 uppercase tracking-tighter">Pengirim</div>
                      <div class="text-sm font-black text-slate-700 dark:text-slate-200">{{ item.user?.username }}</div>
                    </div>
                  </div>

                  <div v-if="item.user?.department" class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-sm">
                      <Building :size="18" />
                    </div>
                    <div class="leading-tight">
                      <div class="text-xs font-bold text-slate-400 uppercase tracking-tighter">Unit Kerja</div>
                      <div class="text-sm font-black text-slate-700 dark:text-slate-300">{{ item.user.department.name }}</div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- 🔥 REPLY SECTION -->
              <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <div v-if="item.replyMessage" class="bg-emerald-50 dark:bg-emerald-500/5 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                  <div class="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck :size="16" />
                    <span class="text-xs font-black uppercase tracking-widest">Tanggapan Admin</span>
                    <span class="text-[10px] text-slate-400 font-bold ml-auto">{{ formatDate(item.repliedAt) }}</span>
                  </div>
                  <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {{ item.replyMessage }}
                  </p>
                  
                  <!-- Reply Attached Image -->
                  <div v-if="item.replyImageUrl" class="mt-4">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                       <ImageIcon :size="14" /> Lampiran Admin
                    </div>
                    <div class="relative w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group/repImg shadow-sm cursor-zoom-in" @click="openImage(item.replyImageUrl)">
                      <img :src="item.replyImageUrl" class="w-full h-auto" />
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/repImg:opacity-100 transition-all flex items-center justify-center pointer-events-none">
                         <span class="text-white text-xs font-bold px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/20">Buka Gambar</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="isAdmin" class="space-y-4">
                  <div class="flex items-center gap-2 text-slate-400">
                    <CornerDownRight :size="16" />
                    <span class="text-xs font-bold uppercase tracking-widest">Kirim Tanggapan</span>
                  </div>
                  <textarea 
                    v-model="replyTexts[item.id]"
                    placeholder="Tulis balasan atau penjelasan di sini..."
                    rows="3"
                    class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-slate-100"
                  ></textarea>
                  <button 
                    @click="submitReply(item.id)"
                    :disabled="!replyTexts[item.id]?.trim() || isSubmittingReply[item.id]"
                    class="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
                  >
                    <Loader2 v-if="isSubmittingReply[item.id]" class="animate-spin" :size="16" />
                    <Send v-else :size="16" />
                    {{ isSubmittingReply[item.id] ? 'Mengirim...' : 'Kirim Balasan' }}
                  </button>
                  <div class="flex items-center gap-4 mt-2">
                    <input type="file" :id="'reply-file-' + item.id" class="hidden" accept="image/*" @change="e => handleReplyFileChange(e, item.id)" />
                    <button @click="(e) => { e.currentTarget.previousElementSibling.click(); }"
                            class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                      <ImageIcon :size="14" /> {{ replyImages[item.id] ? 'Ganti Lampiran' : 'Lampirkan Gambar (Opsional)' }}
                    </button>
                  </div>
                  <div v-if="replyPreviewUrls[item.id]" class="relative w-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm mt-3">
                    <img :src="replyPreviewUrls[item.id]" class="w-full h-auto" />
                    <button @click="replyImages[item.id] = null; replyPreviewUrls[item.id] = null" class="absolute top-1 right-1 bg-red-500/90 text-white rounded p-1 hover:bg-red-600">
                       <Trash2 :size="12" />
                    </button>
                  </div>
                </div>
                <!-- Guest/Employee view if not replied yet -->
                <div v-else class="text-xs font-bold text-slate-400 flex items-center gap-2 italic">
                   <Clock :size="14" /> Menunggu tanggapan dari tim administrator...
                </div>
              </div>
            </div>

            <div v-if="isAdmin" class="flex items-center gap-2 shrink-0 self-end md:self-start mt-4 md:mt-0">
              <button 
                @click="toggleRead(item)"
                class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border"
                :class="item.isRead 
                  ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'"
              >
                <CheckCircle :size="16" />
                <span>{{ item.isRead ? 'Tandai Belum Selesai' : 'Tandai Selesai' }}</span>
              </button>

              <button 
                @click="deleteFeedback(item.id)"
                class="w-[44px] h-[44px] rounded-xl flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 transition-all shadow-sm"
                title="Hapus Pesan"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.whitespace-pre-line {
  font-family: inherit;
}
</style>

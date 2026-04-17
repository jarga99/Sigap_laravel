<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import { API_BASE_URL } from '../../lib/config'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import { downloadFile } from '../../lib/download'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'

const router = useRouter()
const links = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const copiedId = ref<number | null>(null)
const baseUrl = API_BASE_URL

const showModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editId = ref<number | null>(null)

// QR Code States
const showQrModal = ref(false)
const activeQrLink = ref<any>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const qrOptions = ref({ color: '#0f172a', bgColor: '#ffffff', shape: 'square', errorLevel: 'M' })

// Auth & Permissions
const userRole = ref('')
const userDeptId = ref<number | null>(null)

const checkUserAccess = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole.value = payload.role || 'GUEST'
      userDeptId.value = payload.departmentId || null
    } catch (e) { console.error(e) }
  }
}

const canModify = (link: any) => {
  if (userRole.value === 'ADMIN') return true
  if (userRole.value === 'EMPLOYEE' && link.category_id === userDeptId.value) return true
  return false
}

// Form State (No more multi-language)
const form = ref({
  title: '',
  url: '',
  slug: '',
  category_id: '' as string | number,
  desc: '',
  icon: 'Link',
  visibility: 'INTERNAL',
  is_active: true
})

const fetchData = async () => {
  isLoading.value = true
  try {
    const [resLinks, resCats] = await Promise.all([api.get('/admin/links'), api.get('/categories')])
    links.value = resLinks.data
    if (userRole.value === 'EMPLOYEE' && userDeptId.value) {
      categories.value = resCats.data.filter((c: any) => Number(c.id) === Number(userDeptId.value))
    } else {
      categories.value = resCats.data
    }
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

const openModalCreate = () => {
  isEditing.value = false
  editId.value = null
  form.value = { title: '', url: '', slug: '', category_id: '', desc: '', icon: 'Link', visibility: 'INTERNAL', is_active: true }
  showModal.value = true
}

const openModalEdit = (link: any) => {
  isEditing.value = true
  editId.value = link.id
  form.value = { ...link, title: link.title, url: link.url, icon: link.icon || 'Link' }
  showModal.value = true
}

const saveLink = async () => {
  if (!form.value.title || !form.value.url || !form.value.category_id) return alert('Mohon lengkapi data wajib.')
  isSaving.value = true
  try {
    if (isEditing.value && editId.value) await api.put(`/admin/links/${editId.value}`, form.value)
    else await api.post('/admin/links', form.value)
    showModal.value = false
    fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { isSaving.value = false }
}

const deleteLink = async (id: number) => {
  if (!confirm('Hapus tautan ini?')) return
  try {
    await api.delete(`/admin/links/${id}`)
    links.value = links.value.filter(l => l.id !== id)
  } catch (e) { alert('Gagal menghapus') }
}

const copyToClipboard = (slug: string, id: number) => {
  navigator.clipboard.writeText(`${baseUrl}/s/${slug}`)
  copiedId.value = id
  setTimeout(() => copiedId.value = null, 2000)
}

const openQrModal = (link: any) => {
  activeQrLink.value = link
  showQrModal.value = true
  setTimeout(generateQr, 100)
}

const generateQr = async () => {
  if (!activeQrLink.value || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, `${baseUrl}/s/${activeQrLink.value.slug}`, { width: 300, margin: 2 })
  } catch (e) { console.error(e) }
}

const downloadQr = () => {
  if (!qrCanvas.value) return
  const a = document.createElement('a')
  a.download = `QR-${activeQrLink.value.slug}.png`
  a.href = qrCanvas.value.toDataURL()
  a.click()
}

// Table logic
const sortBy = ref('newest')
const filterMonth = ref('all')
const filterYear = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)

const processedLinks = computed(() => {
  let result = [...links.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l => l.title.toLowerCase().includes(q) || l.slug?.toLowerCase().includes(q))
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return processedLinks.value.slice(start, start + pageSize.value)
})

onMounted(() => {
  checkUserAccess()
  fetchData()
})
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manajemen Tautan</h1>
        <p class="text-sm text-slate-500 font-medium">Buat, kelola, dan pantau seluruh link akses layanan.</p>
      </div>
      <div class="flex gap-3 w-full md:w-auto">
         <button @click="fetchData" class="flex-1 md:flex-none p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
           <SIGAPIcons name="RefreshCcw" :size="20" />
         </button>
         <button @click="openModalCreate" class="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95">
           <SIGAPIcons name="Plus" :size="20" />
           <span>Tambah Link</span>
         </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="searchQuery" type="text" placeholder="Cari layanan, slug, atau tujuan..." class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>
      <div class="flex gap-2">
         <select v-model="pageSize" class="bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-bold text-slate-500 outline-none">
           <option :value="10">10 Baris</option>
           <option :value="25">25 Baris</option>
           <option :value="50">50 Baris</option>
         </select>
         <button @click="fetchData" class="px-6 py-3 bg-slate-800 text-white rounded-2xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-2">
           <SIGAPIcons name="Download" :size="16" /> Export
         </button>
      </div>
    </div>

    <!-- Table Container -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-50">
              <th class="px-6 py-5 text-center w-16">No</th>
              <th class="px-6 py-5">Layanan</th>
              <th class="px-6 py-5">Kategori</th>
              <th class="px-6 py-5">Akses</th>
              <th class="px-6 py-5 text-center">Status</th>
              <th class="px-6 py-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
               <td colspan="6" class="px-6 py-8"><div class="h-4 bg-slate-100 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="(link, idx) in paginatedLinks" :key="link.id" class="group hover:bg-slate-50/50 transition-all">
              <td class="px-6 py-5 text-center text-xs font-bold text-slate-300">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:text-blue-600 transition-all">
                    <SIGAPIcons :name="link.icon || 'Link'" :size="20" />
                  </div>
                  <div>
                    <div class="font-bold text-slate-700 text-sm leading-tight">{{ link.title }}</div>
                    <div class="text-[10px] text-slate-400 font-medium font-mono">/s/{{ link.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                 <span class="text-[10px] font-bold px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">{{ link.category?.name || 'Umum' }}</span>
              </td>
              <td class="px-6 py-5">
                 <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <SIGAPIcons :name="link.visibility === 'INTERNAL' ? 'Lock' : 'Building'" :size="14" class="opacity-40" />
                    {{ link.visibility === 'INTERNAL' ? 'Internal' : 'Departemen' }}
                 </div>
              </td>
              <td class="px-6 py-5 text-center">
                 <span :class="link.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border border-black/5">
                   {{ link.is_active ? 'Aktif' : 'Draft' }}
                 </span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button @click="copyToClipboard(link.slug, link.id)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
                      <SIGAPIcons :name="copiedId === link.id ? 'Check' : 'Copy'" :size="16" />
                   </button>
                   <button @click="openQrModal(link)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-purple-600 hover:text-white transition-all">
                      <SIGAPIcons name="QrCode" :size="16" />
                   </button>
                   <button v-if="canModify(link)" @click="openModalEdit(link)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-500 hover:text-white transition-all">
                      <SIGAPIcons name="Edit2" :size="16" />
                   </button>
                   <button v-if="canModify(link)" @click="deleteLink(link.id)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition-all">
                      <SIGAPIcons name="Trash2" :size="16" />
                   </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="p-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Menampilkan {{ paginatedLinks.length }} dari {{ processedLinks.length }}</p>
         <div class="flex gap-2">
            <button @click="currentPage--" :disabled="currentPage === 1" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-30">Prev</button>
            <button @click="currentPage++" :disabled="paginatedLinks.length < pageSize" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-30">Next</button>
         </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fadeup">
             <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 class="font-black text-slate-800">{{ isEditing ? 'Edit Tautan' : 'Buat Tautan Baru' }}</h3>
                <button @click="showModal = false" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                   <SIGAPIcons name="X" :size="20" />
                </button>
             </div>
             
             <form @submit.prevent="saveLink" class="p-6 space-y-5">
                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase">Judul Layanan</label>
                   <input v-model="form.title" type="text" required placeholder="Contoh: Portal E-Kinerja" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" />
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase">URL Tujuan</label>
                   <input v-model="form.url" type="url" required placeholder="https://..." class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                   <div class="space-y-1.5">
                      <label class="text-xs font-black text-slate-400 uppercase">Kategori</label>
                      <select v-model="form.category_id" required class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                         <option value="" disabled>Pilih Kategori</option>
                         <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                      </select>
                   </div>
                   <div class="space-y-1.5">
                      <label class="text-xs font-black text-slate-400 uppercase">Akses</label>
                      <select v-model="form.visibility" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                         <option value="INTERNAL">Login Only</option>
                         <option value="DEPARTMENT">Kategori Saja</option>
                      </select>
                   </div>
                </div>

                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div>
                      <p class="text-xs font-black text-slate-800 uppercase">Status Aktif</p>
                      <p class="text-[10px] text-slate-500 font-medium">Link akan tayang di portal utama</p>
                   </div>
                   <button type="button" @click="form.is_active = !form.is_active" :class="form.is_active ? 'bg-blue-600' : 'bg-slate-300'" class="w-12 h-6 rounded-full relative transition-all">
                      <div :class="form.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"></div>
                   </button>
                </div>

                <div class="flex gap-3 pt-4">
                   <button type="button" @click="showModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-all">Batal</button>
                   <button type="submit" :disabled="isSaving" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <SIGAPIcons v-if="!isSaving" name="Save" :size="16" />
                      <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {{ isSaving ? 'Menyimpan...' : 'Simpan Data' }}
                   </button>
                </div>
             </form>
          </div>
       </div>

       <!-- QR Modal -->
       <div v-if="showQrModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showQrModal = false"></div>
          <div class="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-fadeup border border-white">
             <h3 class="font-black text-slate-800 mb-6 flex items-center justify-center gap-2">
                <SIGAPIcons name="QrCode" :size="20" class="text-purple-600" /> Barcode Link
             </h3>
             <div class="bg-slate-50 p-6 rounded-3xl inline-block mb-6 shadow-inner border border-slate-100">
                <canvas ref="qrCanvas" class="mx-auto rounded-xl"></canvas>
             </div>
             <p class="text-[10px] font-mono text-slate-400 mb-8 break-all opacity-60">/s/{{ activeQrLink?.slug }}</p>
             <div class="flex gap-3">
                <button @click="downloadQr" class="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-purple-100 transition-all">Unduh QR</button>
                <button @click="showQrModal = false" class="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-all">Tutup</button>
             </div>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
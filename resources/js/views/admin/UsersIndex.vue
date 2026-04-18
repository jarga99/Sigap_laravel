<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import { downloadFile } from '../../lib/download'

// State Data
const users = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const isImporting = ref(false)
const importResult = ref<{ success: number, errors: string[] } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const totalUsers = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

const paginatedUsers = computed(() => users.value)

watch([pageSize, currentPage], () => {
  fetchUsers()
})

// State Form
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref<number | null>(null)
const form = ref({
  username: '',
  password: '',
  category_id: '',
  role: 'EMPLOYEE' as 'ADMIN_EVENT' | 'EMPLOYEE'
})

const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users', { params: { page: currentPage.value, limit: pageSize.value } })
    users.value = res.data.data
    totalUsers.value = res.data.meta.total
    totalPages.value = res.data.meta.totalPages
  } catch (err) { console.error(err); alert('Gagal mengambil data user') }
}

const fetchCategories = async () => {
  try {
    const res = await api.get('/categories')
    categories.value = res.data
  } catch (err) { console.error('Gagal load kategori', err) }
}

onMounted(async () => {
  isLoading.value = true
  await Promise.all([fetchUsers(), fetchCategories()])
  isLoading.value = false
})

const openAddModal = () => {
  isEditing.value = false
  editId.value = null
  form.value = { username: '', password: '', category_id: '', role: 'EMPLOYEE' }
  showModal.value = true
}

const openEditModal = (user: any) => {
  isEditing.value = true
  editId.value = user.id
  form.value = { username: user.username, password: '', category_id: user.category_id || '', role: user.role || 'EMPLOYEE' }
  showModal.value = true
}

const handleSaveUser = async () => {
  isSubmitting.value = true
  try {
    if (isEditing.value && editId.value) await api.put(`/admin/users/${editId.value}`, form.value)
    else await api.post('/admin/users', form.value)
    showModal.value = false
    fetchUsers()
  } catch (err: any) { alert(err.response?.data?.error || 'Gagal menyimpan user') }
  finally { isSubmitting.value = false }
}

const deleteUser = async (id: number) => {
  if (confirm('Yakin ingin menghapus user ini?')) {
    try { await api.delete(`/admin/users/${id}`); fetchUsers() }
    catch (err) { alert('Gagal menghapus user') }
  }
}

const triggerImport = () => fileInput.value?.click()

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  isImporting.value = true
  try {
    const { data } = await api.post('/admin/users/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    importResult.value = { success: data.successCount, errors: data.errors || [] }
    if (data.successCount > 0) fetchUsers()
  } catch (error: any) { alert(error.response?.data?.error || 'Gagal mengimpor') }
  finally { isImporting.value = false; if (target) target.value = '' }
}

const downloadTemplate = async () => {
  try { await downloadFile('/admin/users/template', 'template_import_users.xlsx') }
  catch (error) { alert('Gagal mendownload template.') }
}
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manajemen Pengguna</h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Kelola akses dan hak prerogatif seluruh staf instansi.</p>
      </div>
      
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
        <div class="flex gap-2.5 w-full sm:w-auto">
          <input type="file" ref="fileInput" @change="handleImport" accept=".csv, .xlsx" style="display: none;" />
          <button @click="triggerImport" :disabled="isImporting" class="flex-1 sm:flex-none px-6 py-4 flex items-center justify-center gap-3 rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-slate-200/50 bg-white border-2 border-slate-50 text-indigo-600 hover:bg-slate-50 hover:border-blue-100 uppercase tracking-widest active:scale-95">
            <SIGAPIcons v-if="!isImporting" name="Upload" :size="18" />
            <span v-else class="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
            <span>Impor</span>
          </button>
          
          <button @click="downloadTemplate" class="flex-1 sm:flex-none px-6 py-4 flex items-center justify-center gap-3 rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-slate-200/50 bg-white border-2 border-slate-50 text-emerald-600 hover:bg-slate-50 hover:border-emerald-100 uppercase tracking-widest active:scale-95">
            <SIGAPIcons name="Download" :size="18" />
            <span>Template</span>
          </button>
        </div>

        <button @click="openAddModal" class="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3">
          <SIGAPIcons name="Plus" :size="18" /> 
          <span>Tambah User</span>
        </button>
      </div>
    </div>

    <!-- Import Results Report -->
    <div v-if="importResult" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fadeup">
      <div class="flex items-center justify-between mb-6">
        <h4 class="font-black text-slate-800 text-sm uppercase tracking-tighter">Hasil Impor Terakhir</h4>
        <button @click="importResult = null" class="text-[10px] font-black text-slate-400 hover:text-slate-600">TUTUP ✕</button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center">
           <div>
              <p class="text-[9px] font-black text-emerald-600 uppercase">Berhasil</p>
              <p class="text-2xl font-black text-emerald-700">{{ importResult.success }}</p>
           </div>
           <SIGAPIcons name="Check" :size="24" class="text-emerald-500" />
        </div>
        <div class="bg-red-50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
           <div>
              <p class="text-[9px] font-black text-red-600 uppercase">Gagal</p>
              <p class="text-2xl font-black text-red-700">{{ importResult.errors.length }}</p>
           </div>
           <SIGAPIcons name="X" :size="24" class="text-red-500" />
        </div>
      </div>
      <div v-if="importResult.errors.length > 0" class="mt-4 max-h-32 overflow-y-auto space-y-1">
         <div v-for="err in importResult.errors" :key="err" class="text-[10px] font-medium text-red-500 bg-red-50/50 p-2 rounded-lg">• {{ err }}</div>
      </div>
    </div>

    <!-- User Table Container -->
    <div class="bg-white rounded-[2.5rem] border-2 border-white shadow-xl shadow-slate-200/50 overflow-hidden relative z-10">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              <th class="px-8 py-6 font-black">Identitas user</th>
              <th class="px-6 py-6 font-black">Role / akses</th>
              <th class="px-6 py-6 font-black">Unit kerja / kategori</th>
              <th class="px-6 py-6 font-black">Tgl bergabung</th>
              <th class="px-8 py-6 text-right font-black">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
               <td colspan="5" class="px-8 py-8"><div class="h-4 bg-slate-50 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="user in paginatedUsers" :key="user.id" class="group hover:bg-blue-50/40 transition-all duration-300">
              <td class="px-8 py-6">
                <div class="flex items-center gap-5">
                  <div class="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black text-sm group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 group-hover:scale-110 border-2 border-white shadow-sm transition-all duration-500">
                    {{ user.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{{ user.username }}</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <span :class="user.role === 'ADMIN' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'" 
                      class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border-2 border-white">
                   {{ user.role === 'ADMIN' ? 'Administrator' : (user.role === 'ADMIN_EVENT' ? 'Admin Event' : 'Pegawai') }}
                </span>
              </td>
              <td class="px-6 py-5">
                 <span class="text-[11px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-3 py-1 rounded-lg border border-white shadow-sm">{{ user.category?.name || '-' }}</span>
              </td>
              <td class="px-6 py-5">
                 <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] opacity-70">{{ new Date(user.created_at || user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex justify-end gap-2 border-l border-slate-100 pl-4">
                   <button @click="openEditModal(user)" class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100 flex items-center justify-center">
                      <SIGAPIcons name="Edit2" :size="16" />
                   </button>
                   <button @click="deleteUser(user.id)" class="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 flex items-center justify-center">
                      <SIGAPIcons name="Trash2" :size="16" />
                   </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && users.length === 0">
               <td colspan="5" class="px-8 py-24 text-center">
                  <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <SIGAPIcons name="Inbox" :size="48" class="text-slate-200" />
                  </div>
                  <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Belum ada data user</p>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Table Footer / Pagination -->
      <div class="px-8 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
         <div class="flex items-center gap-4">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baris:</span>
            <select v-model="pageSize" class="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none shadow-sm cursor-pointer">
               <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
         </div>
         <div class="flex items-center gap-4">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hal {{ currentPage }} / {{ totalPages }}</span>
            <div class="flex gap-2">
               <button @click="currentPage--" :disabled="currentPage === 1" class="w-11 h-11 flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl text-xs font-black disabled:opacity-30 hover:border-blue-200 transition-all shadow-lg shadow-slate-200/50 active:scale-90">&lsaquo;</button>
               <button @click="currentPage++" :disabled="currentPage >= totalPages" class="w-11 h-11 flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl text-xs font-black disabled:opacity-30 hover:border-blue-200 transition-all shadow-lg shadow-slate-200/50 active:scale-90">&rsaquo;</button>
            </div>
         </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeup">
             <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-[#f4f8ff]/50">
                <h3 class="font-black text-slate-800 text-sm uppercase tracking-tighter">{{ isEditing ? 'Edit Akun Pengguna' : 'Buat Akun Baru' }}</h3>
                <button @click="showModal = false" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                   <SIGAPIcons name="X" :size="20" />
                </button>
             </div>
             
             <form @submit.prevent="handleSaveUser" class="p-6 space-y-5">
                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Username</label>
                   <input v-model="form.username" type="text" required placeholder="pake_underscore" class="w-full bg-[#f4f8ff] border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-300 transition-all outline-none" />
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                   <input v-model="form.password" type="password" :required="!isEditing" placeholder="••••••••" class="w-full bg-[#f4f8ff] border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-300 transition-all outline-none" />
                   <p v-if="isEditing" class="text-[9px] text-slate-400 font-bold">* Kosongkan jika tidak ingin diubah</p>
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Hak Akses / Role</label>
                   <select v-model="form.role" required class="w-full bg-[#f4f8ff] border-none rounded-2xl p-4 text-sm font-bold outline-none">
                      <option value="EMPLOYEE">Pegawai (Default)</option>
                      <option value="ADMIN_EVENT">Admin Event / Portofolio</option>
                   </select>
                </div>

                <div class="space-y-1.5" :class="{ 'opacity-50': form.role === 'ADMIN_EVENT' }">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>Kategori (Unit Kerja)</span>
                      <span v-if="form.role === 'ADMIN_EVENT'" class="text-[9px] text-blue-500 normal-case font-bold tracking-normal italic">Terkunci untuk Admin Event</span>
                   </label>
                   <select v-model="form.category_id" :required="form.role !== 'ADMIN_EVENT'" :disabled="form.role === 'ADMIN_EVENT'" class="w-full bg-[#f4f8ff] border-none rounded-2xl p-4 text-sm font-bold outline-none disabled:cursor-not-allowed">
                      <option value="" disabled>-- Pilih Unit Kerja --</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                   </select>
                </div>

                <div class="flex gap-3 pt-4">
                   <button type="button" @click="showModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                   <button type="submit" :disabled="isSubmitting" class="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                      <span v-if="!isSubmitting">Simpan User</span>
                      <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   </button>
                </div>
             </form>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
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
  departmentId: '',
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
  form.value = { username: '', password: '', departmentId: '', role: 'EMPLOYEE' }
  showModal.value = true
}

const openEditModal = (user: any) => {
  isEditing.value = true
  editId.value = user.id
  form.value = { username: user.username, password: '', departmentId: user.departmentId || '', role: user.role || 'EMPLOYEE' }
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
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manajemen Pengguna</h1>
        <p class="text-sm text-slate-500 font-medium">Kelola akses dan hak prerogatif seluruh staf instansi.</p>
      </div>
      
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <div class="flex gap-2 w-full sm:w-auto">
          <input type="file" ref="fileInput" @change="handleImport" accept=".csv, .xlsx" style="display: none;" />
          <button @click="triggerImport" :disabled="isImporting" class="flex-1 sm:flex-none px-5 py-3 flex items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all shadow-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 uppercase tracking-widest">
            <SIGAPIcons v-if="!isImporting" name="Upload" :size="18" />
            <span v-else class="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
            <span>Impor</span>
          </button>
          
          <button @click="downloadTemplate" class="flex-1 sm:flex-none px-5 py-3 flex items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all shadow-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 uppercase tracking-widest">
            <SIGAPIcons name="Download" :size="18" />
            <span>Template</span>
          </button>
        </div>

        <button @click="openAddModal" class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
          <SIGAPIcons name="Plus" :size="18" /> 
          <span>Tambah User</span>
        </button>
      </div>
    </div>

    <!-- Import Results Report -->
    <div v-if="importResult" class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-fadeup">
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
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-50">
              <th class="px-6 py-5">Identitas User</th>
              <th class="px-6 py-5">Role / Akses</th>
              <th class="px-6 py-5">Unit Kerja / Kategori</th>
              <th class="px-6 py-5">Tgl Bergabung</th>
              <th class="px-6 py-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
               <td colspan="5" class="px-6 py-8"><div class="h-4 bg-slate-50 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="user in paginatedUsers" :key="user.id" class="group hover:bg-slate-50/50 transition-all">
              <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {{ user.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-bold text-slate-700 text-sm">{{ user.username }}</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <span :class="user.role === 'ADMIN' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border border-black/5">
                   {{ user.role === 'ADMIN' ? 'Administrator' : (user.role === 'ADMIN_EVENT' ? 'Admin Event' : 'Pegawai') }}
                </span>
              </td>
              <td class="px-6 py-5">
                 <span class="text-xs font-bold text-slate-500">{{ user.department?.name || '-' }}</span>
              </td>
              <td class="px-6 py-5">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ new Date(user.created_at || user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button @click="openEditModal(user)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-500 hover:text-white transition-all">
                      <SIGAPIcons name="Edit2" :size="16" />
                   </button>
                   <button @click="deleteUser(user.id)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition-all">
                      <SIGAPIcons name="Trash2" :size="16" />
                   </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && users.length === 0">
               <td colspan="5" class="px-6 py-20 text-center">
                  <SIGAPIcons name="Inbox" :size="48" class="mx-auto text-slate-200 mb-4" />
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada data user</p>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Table Footer / Pagination -->
      <div class="p-4 bg-slate-50/30 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
         <div class="flex items-center gap-3">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tampilkan</span>
            <select v-model="pageSize" class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none">
               <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }} Baris</option>
            </select>
         </div>
         <div class="flex items-center gap-6">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hal {{ currentPage }} dari {{ totalPages }}</span>
            <div class="flex gap-1.5">
               <button @click="currentPage--" :disabled="currentPage === 1" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-xs font-black disabled:opacity-30 hover:bg-slate-50 transition-all">&lsaquo;</button>
               <button @click="currentPage++" :disabled="currentPage >= totalPages" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-xs font-black disabled:opacity-30 hover:bg-slate-50 transition-all">&rsaquo;</button>
            </div>
         </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fadeup">
             <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 class="font-black text-slate-800 text-sm uppercase tracking-tighter">{{ isEditing ? 'Edit Akun Pengguna' : 'Buat Akun Baru' }}</h3>
                <button @click="showModal = false" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                   <SIGAPIcons name="X" :size="20" />
                </button>
             </div>
             
             <form @submit.prevent="handleSaveUser" class="p-6 space-y-5">
                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Username</label>
                   <input v-model="form.username" type="text" required placeholder="pake_underscore" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" />
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                   <input v-model="form.password" type="password" :required="!isEditing" placeholder="••••••••" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" />
                   <p v-if="isEditing" class="text-[9px] text-slate-400 font-bold">* Kosongkan jika tidak ingin diubah</p>
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Kategori (Unit Kerja)</label>
                   <select v-model="form.departmentId" required class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                      <option value="" disabled>-- Pilih Unit Kerja --</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                   </select>
                </div>

                <div class="space-y-1.5">
                   <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Hak Akses / Role</label>
                   <select v-model="form.role" required class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                      <option value="EMPLOYEE">Pegawai (Default)</option>
                      <option value="ADMIN_EVENT">Admin Event / Portofolio</option>
                      <option value="ADMIN">Administrator Pusat</option>
                   </select>
                </div>

                <div class="flex gap-3 pt-4">
                   <button type="button" @click="showModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                   <button type="submit" :disabled="isSubmitting" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
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
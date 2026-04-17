<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../lib/axios'
import { UserPlus, Trash2, Loader2, Edit2, Upload, Download } from 'lucide-vue-next'
import { downloadFile } from '../../lib/download'

// State Data
const users = ref<any[]>([])
const categories = ref<any[]>([]) // DATA BARU: Menyimpan list kategori
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

// Dengan pagination server-side, paginatedUsers kini langsung mengambil dari users.value
const paginatedUsers = computed(() => users.value)

// Reset ke halaman 1 saat pageSize berubah dan fetch ulang
watch([pageSize, currentPage], () => {
  fetchUsers()
})

// State Form
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref<number | null>(null)
// UPDATE: Menggunakan departmentId, bukan subdivision string
const form = ref({
  username: '',
  password: '',
  departmentId: '',
  role: 'EMPLOYEE' as 'ADMIN_EVENT' | 'EMPLOYEE'
})



// 1. Fetch Users (Sekarang dengan Pagination Server-Side)
const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    users.value = res.data.data
    totalUsers.value = res.data.meta.total
    totalPages.value = res.data.meta.totalPages
  } catch (err) {
    console.error(err)
    alert('Gagal mengambil data user')
  }
}

// 2. Fetch Categories (Untuk Dropdown Kategori)
const fetchCategories = async () => {
  try {
    // Asumsi endpoint kategori Anda ada di /categories (public) atau /admin/categories
    // Jika error 404, pastikan endpoint ini ada. 
    const res = await api.get('/categories')
    categories.value = res.data
  } catch (err) {
    console.error('Gagal load kategori', err)
  }
}

// Load semua data saat komponen dipasang
onMounted(async () => {
  isLoading.value = true
  await Promise.all([fetchUsers(), fetchCategories()])
  isLoading.value = false
})

// 3. Handle Submit (Simpan User)
const openEditModal = (user: any) => {
  isEditing.value = true
  editId.value = user.id
  form.value = {
    username: user.username,
    password: '',
    departmentId: user.departmentId || '',
    role: user.role || 'EMPLOYEE'
  }
  showModal.value = true
}

const openAddModal = () => {
  isEditing.value = false
  editId.value = null
  form.value = { username: '', password: '', departmentId: '', role: 'EMPLOYEE' }
  showModal.value = true
}

const handleSaveUser = async () => {
  isSubmitting.value = true
  try {
    if (isEditing.value && editId.value) {
      await api.put(`/admin/users/${editId.value}`, form.value)
      alert('User berhasil diperbarui')
    } else {
      await api.post('/admin/users', form.value)
      alert('User berhasil ditambahkan')
    }

    showModal.value = false
    form.value = { username: '', password: '', departmentId: '' }
    fetchUsers() // Refresh tabel
  } catch (err: any) {
    console.error(err)
    alert(err.response?.data?.error || 'Gagal menyimpan user')
  } finally {
    isSubmitting.value = false
  }
}

const deleteUser = async (id: number) => {
  if (confirm('Yakin ingin menghapus user ini?')) {
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (err) {
      alert('Gagal menghapus user')
    }
  }
}

// 4. Bulk Import Logic
const triggerImport = () => {
  fileInput.value?.click()
}

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  isImporting.value = true
  importResult.value = null // Reset hasil sebelumnya
  
  try {
    const { data } = await api.post('/admin/users/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    importResult.value = {
      success: data.successCount,
      errors: data.errors || []
    }

    // Refresh list jika ada yang sukses
    if (data.successCount > 0) {
      fetchUsers()
    }
  } catch (error: any) {
    console.error(error)
    alert(error.response?.data?.error || 'Gagal mengimpor data user')
  } finally {
    isImporting.value = false
    if (target) target.value = ''
  }
}

const downloadTemplate = async () => {
  try {
    await downloadFile('/admin/users/template', 'template_import_users.xlsx')
  } catch (error) {
    alert('Gagal mendownload template.')
  }
}
</script>

<template>
  <div class="admin-container">
    <div class="header-section">
      <div class="w-full md:w-auto flex-1">
        <h2 class="title">Manajemen User</h2>
        <p class="subtitle">Kelola akses dan hak prerogatif seluruh staf instansi.</p>
      </div>
      
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <div class="flex gap-2 w-full sm:w-auto">
          <input type="file" ref="fileInput" @change="handleImport" accept=".csv, .xlsx" style="display: none;" />
          <button @click="triggerImport" :disabled="isImporting" class="flex-1 sm:flex-none px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/30" title="Impor via CSV/Excel">
            <Loader2 v-if="isImporting" class="spinner" :size="18" />
            <Upload v-else :size="18" />
            <span class="whitespace-nowrap">Impor</span>
          </button>
          
          <button @click="downloadTemplate" class="flex-1 sm:flex-none px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/30 dark:hover:bg-teal-500/30" title="Unduh Template (Excel)">
            <Download :size="18" />
            <span class="whitespace-nowrap">Template</span>
          </button>
        </div>

        <button @click="openAddModal" class="w-full sm:w-auto px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          <UserPlus :size="18" /> <span class="whitespace-nowrap">Tambah User</span>
        </button>
      </div>
    </div>

    <!-- Import Results (Premium UI) -->
    <div v-if="importResult" class="mb-6 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          Laporan Hasil Impor Terakhir
        </h4>
        <button @click="importResult = null" class="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors flex items-center gap-1">
          TUTUP LAPORAN ✕
        </button>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div class="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-1">Berhasil Diimpor</div>
            <div class="text-3xl font-black text-emerald-600 dark:text-emerald-500">{{ importResult.success }}</div>
          </div>
          <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            ✓
          </div>
        </div>
        <div class="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div class="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest mb-1">Gagal / Dilewati</div>
            <div class="text-3xl font-black text-rose-600 dark:text-rose-500">{{ importResult.errors.length }}</div>
          </div>
          <div class="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
            ✕
          </div>
        </div>
      </div>

      <div v-if="importResult.errors.length > 0" class="max-h-48 overflow-y-auto space-y-2 mt-4 custom-scrollbar pr-2">
        <div v-for="(err, idx) in importResult.errors" :key="idx" class="text-xs bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-rose-300/80 p-3 rounded-lg border border-slate-100 dark:border-rose-500/10 flex items-start gap-3">
          <span class="mt-0.5 text-rose-500">•</span>
          <span>{{ err }}</span>
        </div>
      </div>
      <div v-else class="text-center py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
        ✨ Selamat! Semua data dalam file berhasil diimpor tanpa kendala.
      </div>
    </div>

      <!-- User Table (Audit Log Style) -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div class="overflow-x-auto">
          <table v-if="!isLoading" class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider transition-colors">
                <th class="px-6 py-4">Username</th>
                <th class="px-6 py-4">Role</th>
                <th class="px-6 py-4">Kategori</th>
                <th class="px-6 py-4">Dibuat Pada</th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
              <tr v-for="user in paginatedUsers" :key="user.id" class="row-item transition-none!">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs font-mono">
                      {{ user.username.charAt(0).toUpperCase() }}
                    </div>
                    <span class="font-bold text-slate-500 dark:text-slate-400">{{ user.username }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span v-if="user.role === 'ADMIN'" class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">Admin</span>
                  <span v-else class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400">{{ user.role }}</span>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{{ user.department?.name || user.subdivision || '-' }}</td>
                <td class="px-6 py-4 text-slate-400 small-date">{{ new Date(user.created_at || user.createdAt).toLocaleDateString('id-ID') }}</td>
                <td class="px-6 py-4 text-right">
                  <div class="super-action-group flex items-center justify-end gap-2">
                    <button @click="openEditModal(user)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:-translate-y-0.5 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20" title="Edit">
                      <Edit2 :size="16" />
                    </button>
                    <button @click="deleteUser(user.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2] hover:-translate-y-0.5 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/20" title="Hapus">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="5" class="empty-state">Belum ada user.</td>
              </tr>
            </tbody>
          </table>

          <div v-else class="flex justify-center p-12">
            <Loader2 class="spinner text-blue-500" :size="32" />
          </div>
      </div>

      <!-- Pagination Controls -->
      <div class="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tampilkan</span>
          <select v-model="pageSize" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }} Baris</option>
          </select>
        </div>

        <div class="flex items-center gap-6">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
            Hal <span class="text-slate-700 dark:text-slate-200">{{ currentPage }}</span> dari {{ totalPages }}
          </span>
          
          <div class="flex items-center gap-1">
            <button 
              @click="currentPage--" 
              :disabled="currentPage === 1" 
              class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
            >
              &lsaquo;
            </button>
            <button 
              @click="currentPage++" 
              :disabled="currentPage >= totalPages" 
              class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box">
        <h3 class="text-lg font-bold mb-4">{{ isEditing ? 'Edit User' : 'Tambah User Baru' }}</h3>
        <form @submit.prevent="handleSaveUser">
          <div class="form-group">
            <label>Username</label>
            <input v-model="form.username" required placeholder="Contoh: ahmad_it" />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" v-model="form.password" :required="!isEditing" placeholder="Kosongkan jika tidak diubah (saat edit)" />
          </div>

          <div class="form-group">
            <label>Kategori (Unit Kerja)</label>
            <select v-model="form.departmentId" required>
              <option value="" disabled>-- Pilih Kategori --</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }} 
              </option>
            </select>
            <small v-if="categories.length === 0" class="text-red-500 text-xs">
              Data kategori kosong/gagal dimuat.
            </small>
          </div>

          <div class="form-group pb-2">
            <label>Role / Akses</label>
            <select v-model="form.role" required>
              <option value="EMPLOYEE">Pegawai (Default)</option>
              <option value="ADMIN_EVENT">Admin Event / Hubungan Instansi</option>
            </select>
          </div>

          <div class="modal-actions mt-2">
            <button type="button" @click="showModal = false" class="btn-cancel">Batal</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary">
              <span v-if="isSubmitting">Menyimpan...</span>
              <span v-else>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 2000px;
  margin: 0 auto;
  min-height: 100vh;
}

.header-section {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

@media (min-width: 768px) {
  .header-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.title {
  font-size: 2rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  margin-top: 0.25rem;
}

/* BUTTONS */
.btn-primary-gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary-gradient:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 15px -3px rgba(79, 70, 229, 0.4);
}

.btn-fancy-outline {
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fancy-outline:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.shadow-btn { box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }

/* TABLE CARD */
.table-card-wrapper { width: 100%; margin-bottom: 3rem; }

.table-box {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 1rem;
}

.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
}

.main-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 900px; }

.main-table th {
  background: #f8fafc;
  padding: 1rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.main-table td {
  padding: 1.25rem 1rem;
  border-top: 1px solid #f1f5f9;
  vertical-align: middle;
}

.row-item:hover { background: #f1f5f9; }

/* USER INFO */
.user-avatar-mini {
  width: 32px;
  height: 32px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
}

.small-date { font-size: 0.8rem; font-weight: 500; }

/* BADGES */
.role-badge {
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  display: inline-block;
}

.role-badge.ADMIN { background: #fee2e2; color: #ef4444; }
.role-badge.ADMIN_EVENT { background: #fef3c7; color: #d97706; }
.role-badge.EMPLOYEE { background: #dcfce7; color: #10b981; }

.action-cell { text-align: right; }
.super-action-group { display: flex; gap: 8px; justify-content: flex-end; }

.btn-action-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f1f5f9;
  color: #64748b;
}

.btn-action-icon:hover { transform: translateY(-2px); }
.btn-action-icon.amber { color: #d97706; border-color: #fef3c7; background: #fffbeb; }
.btn-action-icon.red { color: #dc2626; border-color: #fee2e2; background: #fef2f2; }

.empty-state { padding: 4rem; text-align: center; color: #94a3b8; font-weight: 500; }

.spinner { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* MODAL & FORM */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-box {
  background: #ffffff;
  padding: 2rem;
  border-radius: 20px;
  width: 450px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 700; color: #475569; }

input, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background-color: #f8fafc;
  outline: none;
  transition: all 0.2s;
}

input:focus, select:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 2rem; }
.btn-cancel { background: #f1f5f9; border: none; padding: 0.75rem 1.5rem; border-radius: 10px; cursor: pointer; color: #64748b; font-weight: 600; }

/* DARK MODE */
:global(.dark) .admin-container { background: #0f172a; }
:global(.dark) .title { color: #f1f5f9; }
:global(.dark) .btn-fancy-outline { background: #1e293b; border-color: #334155; color: #94a3b8; }
:global(.dark) .row-item { background: #1e293b; color: #94a3b8; transition: none !important; }
:global(.dark) .row-item:hover { background: transparent !important; }
:global(.dark) .btn-action-icon.blue { color: #60a5fa; border-color: rgba(96, 165, 250, 0.3); background: rgba(96, 165, 250, 0.1); }
:global(.dark) .btn-action-icon.amber { color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); background: rgba(251, 191, 36, 0.1); }
:global(.dark) .btn-action-icon.red { color: #f87171; border-color: rgba(248, 113, 113, 0.3); background: rgba(248, 113, 113, 0.1); }
:global(.dark) .role-badge.ADMIN { background: rgba(239, 68, 68, 0.15); color: #f87171; }
:global(.dark) .role-badge.ADMIN_EVENT { background: rgba(217, 119, 6, 0.15); color: #fbbf24; }
:global(.dark) .role-badge.EMPLOYEE { background: rgba(16, 185, 129, 0.15); color: #4ade80; }
:global(.dark) .modal-box { background: #1e293b; border-color: #334155; }
:global(.dark) .form-group label { color: #94a3b8; }
:global(.dark) input, :global(.dark) select { background: #0f172a; border-color: #334155; color: #f1f5f9; }
:global(.dark) .btn-cancel { background: #334155; color: #94a3b8; }
</style>
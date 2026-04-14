<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import api from '../../lib/axios'
import * as LucideIcons from 'lucide-vue-next'
import { Plus, Edit2, Trash2, FolderOpen, Save, X, Briefcase, Globe, Activity, Archive, Book, Heart, Star, Video, Image as ImageIcon } from 'lucide-vue-next'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'

const showIconModal = ref(false)

const iconMap: Record<string, any> = {
  FolderOpen, Briefcase, Globe, Activity, Archive, Book, Heart, Star, Video, ImageIcon
}
const availableIcons = Object.keys(iconMap)

interface Category {
  id: number
  name: string
  name_en: string | null
  icon: string | null
}

const categories = ref<Category[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

const form = reactive({
  id: null as number | null,
  name: '',
  name_en: '',
  icon: 'FolderOpen'
})



// State untuk menyimpan data user yang sedang login
const userRole = ref('')
const userDeptId = ref<number | null>(null)

const checkUserAccess = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userRole.value = payload.role || 'GUEST'
      userDeptId.value = payload.departmentId || null
    } catch (error) {
      console.error('Gagal decode token:', error)
    }
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/categories')
    const allCats = res.data

    // RBAC FILTER
    if (userRole.value === 'EMPLOYEE' && userDeptId.value) {
      const deptId = Number(userDeptId.value)
      categories.value = allCats.filter((c: any) => Number(c.id) === deptId)
    } else {
      categories.value = allCats
    }
  } catch (e) {
    console.error("Gagal memuat kategori")
  } finally {
    isLoading.value = false
  }
}

const openModal = (cat?: Category) => {
  if (userRole.value !== 'ADMIN') return; // Prevent non-admins from opening modal

  if (cat) {
    isEditing.value = true
    Object.assign(form, { id: cat.id, name: cat.name, name_en: cat.name_en || '', icon: cat.icon || 'FolderOpen' })
  } else {
    isEditing.value = false
    Object.assign(form, { id: null, name: '', name_en: '', icon: 'FolderOpen' })
  }
  showModal.value = true
}

const saveCategory = async () => {
  if (userRole.value !== 'ADMIN') return;
  if (!form.name) return alert('Nama kategori wajib diisi')
  isSaving.value = true
  try {
    const payload = { name: form.name, name_en: form.name_en, icon: form.icon }

    if (isEditing.value && form.id) {
      await api.put(`/categories/${form.id}`, payload)
    } else {
      await api.post('/categories', payload)
    }
    await loadData()
    showModal.value = false
  } catch (e: any) {
    alert(e.response?.data?.error || 'Gagal menyimpan kategori')
  } finally {
    isSaving.value = false
  }
}

const deleteCategory = async (id: number) => {
  if (userRole.value !== 'ADMIN') return;
  if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return

  try {
    const res = await api.delete(`/categories/${id}`)
    categories.value = categories.value.filter(c => c.id !== id)
    alert(res.data.message || 'Kategori berhasil dihapus')
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Gagal menghapus kategori'
    alert(errorMsg)
  }
}

onMounted(() => {
  checkUserAccess()
  loadData()
})
</script>

<template>
  <div class="page-view animate-fadeup">
    <header class="page-header">
      <div>
        <h1>Kategori Layanan</h1>
        <p class="subtitle">Kelompokkan aplikasi dan tautan agar lebih rapi.</p>
      </div>
      <button v-if="userRole === 'ADMIN'" @click="openModal()" class="btn-primary">
        <Plus :size="18" /> Tambah Kategori
      </button>
    </header>

      <div class="grid-container">
      <div v-if="isLoading">Memuat data...</div>

      <div v-else v-for="cat in categories" :key="cat.id" class="cat-card">
        <div class="cat-icon">
          <component :is="(LucideIcons as any)[cat.icon || 'FolderOpen']" :size="24" />
        </div>
        <div class="cat-info">
          <h3>{{ cat.name }}</h3>
          <span class="cat-lang-en">{{ cat.name_en || 'Menerjemahkan...' }}</span>
        </div>
        <div v-if="userRole === 'ADMIN'" class="cat-actions flex items-center justify-end gap-2">
          <button @click="openModal(cat)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:-translate-y-0.5 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20" title="Edit">
            <Edit2 :size="16" />
          </button>
          <button @click="deleteCategory(cat.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2] hover:-translate-y-0.5 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/20" title="Hapus">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <div v-if="userRole === 'ADMIN'" class="cat-card add-card" @click="openModal()">
        <Plus :size="32" />
        <span>Buat Baru</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ isEditing ? 'Edit Kategori' : 'Kategori Baru' }}</h3>
            <button @click="showModal = false" class="btn-close">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label>Nama Kategori (ID)</label>
              <input v-model="form.name" type="text" placeholder="..." autofocus />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label>Nama Kategori (EN) 🤖</label>
              <input v-model="form.name_en" type="text" placeholder="..." />
            </div>
            <div class="form-group">
              <label>Pilih Ikon</label>
              <button 
                type="button" 
                class="icon-preview-btn" 
                @click="showIconModal = true"
              >
                <component :is="(LucideIcons as any)[form.icon || 'FolderOpen']" :size="24" />
                <span>Ubah Ikon</span>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showModal = false" class="btn-ghost">Batal</button>
            <button @click="saveCategory" :disabled="isSaving" class="btn-primary">
              <Save :size="16" /> {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <IconSelectorModal 
      :isOpen="showIconModal" 
      :currentIcon="form.icon || 'FolderOpen'"
      @close="showIconModal = false"
      @select="(icon) => form.icon = icon"
    />
  </div>
</template>

<style scoped>
.page-view {
  padding-top: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
  color: #1e293b;
}

.subtitle {
  color: #64748b;
  margin-top: 4px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.cat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.cat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.05);
  border-color: #3b82f6;
}

.cat-icon {
  width: 50px;
  height: 50px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-info h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}

.cat-lang-en {
  font-size: 0.8rem;
  color: #94a3b8;
  font-style: italic;
}

.cat-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.cat-card:hover .cat-actions {
  opacity: 1;
}

.add-card {
  border: 2px dashed #cbd5e1;
  background: transparent;
  cursor: pointer;
  color: #94a3b8;
  justify-content: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.add-card:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f8fafc;
  transform: none;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: white;
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  overflow: hidden;
  animation: popUp 0.3s;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1.2rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
}

.form-group input {
  padding: 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  width: 100%;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #3b82f6;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #f8fafc;
}

.btn-primary {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #64748b;
  padding: 0.7rem 1.2rem;
}

.btn-close {
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #3b82f6;
  color: white;
}

.btn-icon.delete:hover {
  background: #ef4444;
}

@keyframes popUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fadeup {
  animation: fadeUp 0.5s ease-out;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.icon-preview-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  color: #1e293b;
  font-weight: 600;
  transition: all 0.2s;
}

.icon-preview-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

:global(.dark) .icon-preview-btn {
  background: #334155;
  border-color: #475569;
  color: white;
}
</style>
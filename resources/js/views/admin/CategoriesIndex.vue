<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const categories = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref<number | null>(null)
const isSaving = ref(false)

const form = ref({
  name: '',
  description: '',
  icon: 'FolderOpen'
})

const fetchCategories = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/categories')
    categories.value = res.data
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const openCreateModal = () => {
  isEditing.value = false
  editId.value = null
  form.value = { name: '', description: '', icon: 'FolderOpen' }
  showModal.value = true
}

const openEditModal = (cat: any) => {
  isEditing.value = true
  editId.value = cat.id
  form.value = { name: cat.name, description: cat.description || '', icon: cat.icon || 'FolderOpen' }
  showModal.value = true
}

const saveCategory = async () => {
  if (!form.value.name) return
  isSaving.value = true
  try {
    if (isEditing.value && editId.value) await api.put(`/admin/categories/${editId.value}`, form.value)
    else await api.post('/admin/categories', form.value)
    showModal.value = false
    fetchCategories()
  } catch (err) { alert('Gagal menyimpan kategori') }
  finally { isSaving.value = false }
}

const deleteCategory = async (id: number) => {
  if (!confirm('Hapus kategori ini? Tautan di dalamnya mungkin terpengaruh.')) return
  try { await api.delete(`/admin/categories/${id}`); fetchCategories() }
  catch (err) { alert('Gagal menghapus kategori') }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Kategori Layanan</h1>
        <p class="text-sm text-slate-500 font-medium">Pengelompokan unit kerja dan jenis layanan portal.</p>
      </div>
      <button @click="openCreateModal" class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
        <SIGAPIcons name="Plus" :size="20" /> 
        <span>Tambah Kategori</span>
      </button>
    </div>

    <!-- Grid Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-if="isLoading" v-for="i in 3" :key="i" class="h-48 bg-white border border-slate-100 rounded-3xl animate-pulse"></div>
      
      <div v-else v-for="cat in categories" :key="cat.id" class="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
         <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button @click="openEditModal(cat)" class="p-2 bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all">
               <SIGAPIcons name="Edit2" :size="16" />
            </button>
            <button @click="deleteCategory(cat.id)" class="p-2 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all">
               <SIGAPIcons name="Trash2" :size="16" />
            </button>
         </div>

         <div class="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <SIGAPIcons :name="cat.icon || 'FolderOpen'" :size="28" />
         </div>
         
         <h3 class="font-black text-slate-800 text-lg mb-2">{{ cat.name }}</h3>
         <p class="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">{{ cat.description || 'Tidak ada deskripsi kategori.' }}</p>
         
         <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">{{ cat._count?.links || 0 }} Tautan</span>
            <div class="flex -space-x-2">
               <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white bg-slate-100"></div>
            </div>
         </div>
      </div>

      <div v-if="!isLoading && categories.length === 0" class="col-span-full py-20 text-center">
         <SIGAPIcons name="Inbox" :size="64" class="mx-auto text-slate-100 mb-4" />
         <p class="text-xs font-black text-slate-300 uppercase tracking-widest">Belum ada kategori yang dibuat</p>
      </div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fadeup">
             <div class="p-8 pb-4 text-center">
                <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                   <SIGAPIcons :name="isEditing ? 'Edit2' : 'Plus'" :size="32" />
                </div>
                <h3 class="font-black text-slate-800 text-xl tracking-tight mb-2">{{ isEditing ? 'Edit Kategori' : 'Kategori Baru' }}</h3>
                <p class="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed">Atur unit kerja atau departemen layanan.</p>
             </div>
             
             <form @submit.prevent="saveCategory" class="p-8 space-y-6">
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Nama Kategori</label>
                   <input v-model="form.name" required placeholder="Contoh: Bidang IT" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1">Deskripsi Singkat</label>
                   <textarea v-model="form.description" rows="3" placeholder="Jelaskan fungsi kategori ini..." class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all"></textarea>
                </div>

                <div class="flex gap-3 pt-4">
                   <button type="button" @click="showModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                   <button type="submit" :disabled="isSaving" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <span v-if="!isSaving">Simpan Data</span>
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
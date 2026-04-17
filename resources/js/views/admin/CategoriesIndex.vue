<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'

const categories = ref<any[]>([])
const isLoading = ref(true)
const showModal = ref(false)
const showIconPicker = ref(false)
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
  form.value = { 
    name: cat.name, 
    description: cat.description || '', 
    icon: cat.icon || 'FolderOpen' 
  }
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

const handleIconSelect = (icon: string) => {
  form.value.icon = icon
}

onMounted(fetchCategories)
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-slate-800 tracking-tight">Kategori Layanan</h1>
        <p class="text-sm text-slate-400 font-semibold flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
           Pengelompokan unit kerja dan jenis layanan portal anda
        </p>
      </div>
      <button @click="openCreateModal" class="group relative px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20 overflow-hidden">
        <div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <SIGAPIcons name="Plus" :size="20" class="relative z-10" /> 
        <span class="relative z-10 text-sm">Tambah Kategori Baru</span>
      </button>
    </div>

    <!-- Grid Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      <!-- Loading State -->
      <div v-if="isLoading" v-for="i in 4" :key="i" class="h-[280px] bg-white border border-slate-100 rounded-[2.5rem] animate-pulse shadow-sm"></div>
      
      <!-- Actual Data -->
      <template v-else>
         <div v-for="cat in categories" :key="cat.id" class="group bg-white p-8 rounded-[2.5rem] border border-blue-50 hover:border-blue-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative flex flex-col justify-between h-[300px]">
            <!-- Hover Actions -->
            <div class="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
               <button @click="openEditModal(cat)" class="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                  <SIGAPIcons name="Edit2" :size="16" />
               </button>
               <button @click="deleteCategory(cat.id)" class="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                  <SIGAPIcons name="Trash2" :size="16" />
               </button>
            </div>

            <div>
               <!-- Icon Display -->
               <div class="w-16 h-16 bg-blue-50/50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                  <SIGAPIcons :name="cat.icon || 'FolderOpen'" :size="32" />
               </div>
               
               <h3 class="font-bold text-slate-800 text-xl mb-2 group-hover:text-blue-700 transition-colors">{{ cat.name }}</h3>
               <p class="text-slate-400 text-sm font-medium line-clamp-2 leading-relaxed">
                  {{ cat.description || 'Tidak ada deskripsi untuk unit kerja ini.' }}
               </p>
            </div>
            
            <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
               <div class="px-4 py-1.5 bg-slate-50 rounded-full">
                  <span class="text-[10px] font-black uppercase text-slate-500 tracking-wider">{{ cat.links_count ?? 0 }} Tautan</span>
               </div>
               <div class="flex -space-x-3">
                  <div v-for="i in 3" :key="i" class="w-8 h-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center overflow-hidden">
                     <span class="text-[8px] font-bold text-blue-300">USER</span>
                  </div>
               </div>
            </div>
         </div>

         <!-- Add New Card (Forgotten Feature) -->
         <button @click="openCreateModal" class="group h-[300px] bg-blue-50/30 border-4 border-dashed border-blue-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-blue-50 hover:border-blue-300 transition-all duration-500">
            <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-400 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-90">
               <SIGAPIcons name="Plus" :size="24" />
            </div>
            <span class="text-sm font-black text-blue-400 uppercase tracking-widest">Buat Unit Baru</span>
         </button>
      </template>

      <!-- Empty State -->
      <div v-if="!isLoading && categories.length === 0" class="col-span-full py-20 text-center">
         <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <SIGAPIcons name="Inbox" :size="48" class="text-blue-200" />
         </div>
         <p class="text-lg font-bold text-slate-600 mb-2">Belum ada kategori layanan</p>
         <p class="text-sm text-slate-400 font-medium">Klik tombol di atas untuk membuat unit kerja pertama Anda.</p>
      </div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
       <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-pop">
             <div class="p-10 pb-6">
                <div class="flex items-start justify-between">
                   <div class="flex gap-6 items-center">
                     <!-- Clickable Icon Selector -->
                     <div 
                       class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-blue-100 transition-all group relative shadow-inner overflow-hidden" 
                       @click="showIconPicker = true"
                     >
                        <SIGAPIcons :name="form.icon" :size="40" />
                        <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center transition-all">
                           <SIGAPIcons name="Edit2" :size="16" class="opacity-0 group-hover:opacity-100 text-blue-600" />
                        </div>
                     </div>
                     <div>
                        <h3 class="font-bold text-slate-800 text-2xl tracking-tight mb-2">{{ isEditing ? 'Edit Unit Kerja' : 'Daftarkan Unit Baru' }}</h3>
                        <p class="text-sm text-slate-400 font-medium">Kelola informasi departemen atau kejuruan portal</p>
                     </div>
                   </div>
                   <button @click="showModal = false" class="text-slate-300 hover:text-slate-500 transition-colors">
                      <SIGAPIcons name="X" :size="24" />
                   </button>
                </div>
             </div>
             
             <form @submit.prevent="saveCategory" class="p-10 pt-4 space-y-8">
                <div class="space-y-3 font-bold group">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                       <SIGAPIcons name="Hash" :size="10" /> Nama Kategori / Unit
                   </label>
                   <input v-model="form.name" required placeholder="Contoh: Bidang Teknologi Informatika" class="w-full bg-slate-50 rounded-2xl p-5 text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300" />
                </div>

                <div class="space-y-3 font-bold group">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                       <SIGAPIcons name="AlignLeft" :size="10" /> Deskripsi Singkat
                   </label>
                   <textarea v-model="form.description" rows="4" placeholder="Jelaskan mengenai departemen atau layanan ini..." class="w-full bg-slate-50 rounded-2xl p-5 text-sm font-semibold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-300"></textarea>
                </div>

                <div class="flex gap-4 pt-6">
                   <button type="submit" :disabled="isSaving" class="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-sm tracking-wide shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                      <span v-if="!isSaving">{{ isEditing ? 'Simpan Perubahan' : 'Daftarkan Unit Sekarang' }}</span>
                      <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   </button>
                </div>
             </form>
          </div>
       </div>
    </Teleport>

    <!-- Icon Picker -->
    <IconSelectorModal 
      :isOpen="showIconPicker" 
      :currentIcon="form.icon" 
      @close="showIconPicker = false" 
      @select="handleIconSelect" 
    />
  </div>
</template>

<style scoped>
.animate-pop { animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
}
</style>
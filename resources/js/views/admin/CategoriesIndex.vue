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
  if (!confirm('Hapus kategori ini? Hanya kategori kosong (tanpa tautan & pegawai) yang dapat dihapus.')) return
  try { 
      await api.delete(`/admin/categories/${id}`); 
      fetchCategories();
  } catch (err: any) { 
      alert(err.response?.data?.error || 'Gagal menghapus kategori'); 
  }
}

const handleIconSelect = (icon: string) => {
  form.value.icon = icon
}

onMounted(fetchCategories)
</script>

<template>
  <div class="space-y-10 animate-fadeup pb-20">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Kategori Layanan</h1>
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Pengelompokan unit kerja dan jenis layanan portal.</p>
      </div>
      <button @click="openCreateModal" class="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-3">
        <SIGAPIcons name="Plus" :size="20" /> 
        Tambah Kategori
      </button>
    </div>

    <!-- Grid Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      <!-- Loading State -->
      <div v-if="isLoading" v-for="i in 4" :key="i" class="h-[280px] bg-white border border-slate-100 rounded-[2.5rem] animate-pulse shadow-sm"></div>
      
      <!-- Actual Data -->
      <template v-else>
         <div v-for="cat in categories" :key="cat.id" class="group bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative flex flex-col justify-between h-[320px] overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform pointer-events-none"></div>
            
            <!-- Actions (Always Visible) -->
            <div class="absolute top-6 right-6 flex gap-2 opacity-100 z-20">
               <button @click.stop.prevent="openEditModal(cat)" class="w-10 h-10 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition-all shadow-lg border border-amber-100 flex items-center justify-center">
                  <SIGAPIcons name="Edit2" :size="16" />
               </button>
               <button @click.stop.prevent="deleteCategory(cat.id)" class="w-10 h-10 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg border border-red-100 flex items-center justify-center">
                  <SIGAPIcons name="Trash2" :size="16" />
               </button>
            </div>

            <div class="relative z-10">
               <!-- Icon Display -->
               <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white border-2 border-white shadow-sm transition-all duration-500">
                  <SIGAPIcons :name="cat.icon || 'FolderOpen'" :size="32" />
               </div>
               
               <h3 class="font-black text-slate-800 text-xl mb-2 group-hover:text-blue-600 transition-colors tracking-tight">{{ cat.name }}</h3>
               <p class="text-slate-400 text-[11px] font-bold uppercase tracking-widest line-clamp-2 leading-relaxed opacity-100">
                  {{ cat.description || 'Tidak ada deskripsi untuk unit kerja ini.' }}
               </p>
            </div>
            
            <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
               <div class="px-5 py-2 bg-slate-50 rounded-xl border border-white shadow-sm">
                  <span class="text-[10px] font-black uppercase text-slate-500 tracking-widest">{{ cat.links_count ?? 0 }} Tautan</span>
               </div>
               <div class="flex -space-x-3" v-if="cat.users && cat.users.length > 0">
                  <div v-for="(user, idx) in cat.users" :key="user.id" class="w-9 h-9 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform" :style="`transition-delay: ${idx*50}ms`" :title="user.username">
                     <img v-if="user.image_url" :src="`/storage/${user.image_url}`" class="w-full h-full object-cover" />
                     <SIGAPIcons v-else name="User" :size="14" class="text-slate-400" />
                  </div>
                  <!-- Show remainder if any -->
                  <div v-if="cat.users_count > 3" class="w-9 h-9 rounded-xl border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-10">
                     <span class="text-[10px] font-bold text-slate-500">+{{ cat.users_count - 3 }}</span>
                  </div>
               </div>
               <div class="flex -space-x-3" v-else>
                  <div class="w-9 h-9 rounded-xl border-2 border-white bg-slate-50/50 flex items-center justify-center overflow-hidden shadow-sm">
                     <SIGAPIcons name="UserMinus" :size="14" class="text-slate-200" />
                  </div>
               </div>
            </div>
         </div>

         <!-- Add New Card -->
         <button @click="openCreateModal" class="group h-[320px] bg-slate-100/30 border-4 border-dashed border-white rounded-[2.5rem] flex flex-col items-center justify-center gap-5 hover:bg-white hover:border-blue-200 hover:shadow-2xl transition-all duration-500 shadow-sm relative overflow-hidden">
            <div class="absolute inset-0 bg-blue-50/20 transition-opacity"></div>
            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-xl border border-slate-50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-90 relative z-10">
               <SIGAPIcons name="Plus" :size="28" />
            </div>
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-blue-500 transition-colors relative z-10">Daftarkan Unit Baru</span>
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
                       class="w-20 h-20 bg-blue-50 text-[#4f86e8] rounded-2xl flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-blue-100 transition-all group relative shadow-inner overflow-hidden" 
                       @click="showIconPicker = true"
                     >
                        <SIGAPIcons :name="form.icon" :size="40" />
                        <div class="absolute inset-0 bg-[#4f86e8]/10 flex flex-col items-center justify-center text-[#4f86e8] gap-2">
                           <SIGAPIcons name="Edit2" :size="16" />
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
                   <input v-model="form.name" required placeholder="Contoh: Bidang Teknologi Informatika" class="w-full bg-[#f4f8ff] rounded-2xl p-5 text-lg font-bold border-2 border-transparent focus:border-blue-300 focus:bg-white outline-none transition-all placeholder:text-slate-300" />
                </div>

                <div class="space-y-3 font-bold group">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                       <SIGAPIcons name="AlignLeft" :size="10" /> Deskripsi Singkat
                   </label>
                   <textarea v-model="form.description" rows="4" placeholder="Jelaskan mengenai departemen atau layanan ini..." class="w-full bg-[#f4f8ff] rounded-2xl p-5 text-sm font-semibold border-2 border-transparent focus:border-blue-300 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-300"></textarea>
                </div>

                <div class="flex gap-4 pt-6">
                   <button type="submit" :disabled="isSaving" class="flex-1 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold text-sm tracking-wide shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3">
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
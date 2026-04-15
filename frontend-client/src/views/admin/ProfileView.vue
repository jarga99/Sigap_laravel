<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import api from '../../lib/axios'
import { User, Camera, Save, Lock, Briefcase, Shield } from 'lucide-vue-next'
import { API_BASE_URL } from '../../lib/config'

const authStore = useAuthStore()
const API_URL = API_BASE_URL
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

// State Form
const form = ref({
    fullName: '',
    email: '',
    password: '',
    oldPassword: '',
    subdivision: 'Memuat...', // Placeholder saat loading
    username: ''
})

// State untuk Gambar
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const fetchCategoryName = async () => {
    // Super Admin & Admin Event punya label kategori khusus
    if (authStore.user?.role === 'ADMIN') {
        form.value.subdivision = 'Tidak Ada (Super Admin)'
        return
    }

    if (authStore.user?.role === 'ADMIN_EVENT') {
        form.value.subdivision = 'Manajemen Event'
        return
    }

    // Cek jika sudah ada di authStore (hasil include dari backend)
    const userDept = authStore.user?.department
    if (userDept && userDept.name) {
        form.value.subdivision = userDept.name
        return
    }

    // Jika tidak ada tapi ada ID, coba fetch (fallback)
    const deptId = authStore.user?.departmentId
    if (!deptId) {
        form.value.subdivision = '-'
        return
    }

    try {
        const res = await api.get('/categories')
        const categories = res.data
        const found = categories.find((c: any) => c.id === deptId)
        form.value.subdivision = found ? found.name : '-'
    } catch (err) {
        console.error('Gagal load kategori', err)
        form.value.subdivision = 'Gagal memuat data'
    }
}

// Load data awal saat komponen dipasang
const fetchUserData = async () => {
    try {
        const res = await api.get('/users/profile')
        const userData = res.data.user
        
        // Update local form
        form.value.fullName = userData.fullName || ''
        form.value.username = userData.username || ''
        form.value.email = userData.email || ''

        if (userData.image_url) {
            const fileName = userData.image_url.split('/').pop()
            previewImage.value = `${API_URL}/uploads/profiles/${fileName}`
        }

        // Sync to AuthStore in case it was outdated
        authStore.updateUser(userData)
        
        await fetchCategoryName()
    } catch (err) {
        console.error('Gagal sinkron data profil', err)
    }
}

onMounted(async () => {
    isLoading.value = true
    await fetchUserData()
    isLoading.value = false
})

// Trigger input file saat tombol kamera diklik
const triggerFileInput = () => {
    fileInput.value?.click()
}

// Handle saat file dipilih
const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
        const file = target.files[0]
        selectedFile.value = file
        const reader = new FileReader()
        reader.onload = (e) => {
            previewImage.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
}

// Simpan Perubahan
const saveProfile = async () => {
    isLoading.value = true
    message.value = ''
    isError.value = false

    try {
        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (form.value.email && !emailRegex.test(form.value.email)) {
            isError.value = true
            message.value = 'Format email tidak valid!'
            isLoading.value = false
            return
        }

        const formData = new FormData()
        formData.append('fullName', form.value.fullName)
        formData.append('email', form.value.email)
        formData.append('type', 'profiles')
        formData.append('oldPassword', form.value.oldPassword)
        if (form.value.password) {
            formData.append('password', form.value.password)
        }
        if (selectedFile.value) {
            formData.append('image', selectedFile.value)
        }

        const res = await api.put('/users/profile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })

        const userData = res.data.user
        let fileNameOnly = ""
        if (userData.image_url) {
            fileNameOnly = userData.image_url.split('/').pop()
        }

        authStore.updateUser({
            ...userData,
            image_url: fileNameOnly
        })

        if (fileNameOnly) {
            previewImage.value = `${API_URL}/uploads/profiles/${fileNameOnly}`
        }

        message.value = 'Profil berhasil diperbarui!'
        form.value.password = ''
        form.value.oldPassword = ''
        selectedFile.value = null

    } catch (error: any) {
        isError.value = true
        message.value = error.response?.data?.error || 'Gagal memperbarui profil'
    } finally {
        isLoading.value = false
        setTimeout(() => message.value = '', 3000)
    }
}
</script>

<template>
    <div class="page-container animate-fade">
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengaturan Akun</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Kelola informasi profil dan keamanan akun Anda.</p>
        </div>

        <div class="card">
            <div class="grid-layout">
                <!-- Sidebar Avatar -->
                <div class="avatar-sidebar">
                    <div class="avatar-wrapper">
                        <img :src="previewImage || `https://ui-avatars.com/api/?name=${form.username}&background=eff6ff&color=3b82f6`"
                            alt="Profile" class="avatar-img" />
                        <button @click="triggerFileInput" class="btn-camera" title="Ganti Foto">
                            <Camera :size="18" />
                        </button>
                        <input ref="fileInput" type="file" accept="image/*" class="hidden"
                            @change="handleFileChange" />
                    </div>
                    <div class="mt-4 text-center">
                        <p class="font-bold text-slate-800 dark:text-slate-200">{{ authStore.user?.fullName || authStore.user?.username }}</p>
                        <span class="role-badge">{{ authStore.user?.role }}</span>
                    </div>
                </div>

                <!-- Form Section -->
                <form @submit.prevent="saveProfile" class="form-section">
                    
                    <div v-if="message" :class="['alert', isError ? 'error' : 'success']">
                        {{ message }}
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label><Shield :size="14" class="inline mr-1" /> Username</label>
                            <input v-model="form.username" disabled class="input-disabled" />
                            <small class="help-text">Username tidak dapat diubah.</small>
                        </div>

                        <div class="form-group">
                            <label><Briefcase :size="14" class="inline mr-1" /> Kategori</label>
                            <input v-model="form.subdivision" disabled class="input-disabled" />
                            <small class="help-text">Hubungi Admin untuk pindah kategori.</small>
                        </div>

                        <div class="form-group full-width">
                            <label>Email Resmi</label>
                            <input v-model="form.email" type="email" placeholder="contoh@instansi.go.id" class="input-field" />
                            <small class="help-text">Email ini digunakan untuk fitur Login With Google.</small>
                        </div>

                        <div class="form-group full-width">
                            <label>Nama Lengkap</label>
                            <input v-model="form.fullName" type="text" placeholder="Masukkan nama lengkap" class="input-field" />
                        </div>

                        <div class="form-group full-width">
                            <label class="text-red-500 font-bold">Password Saat Ini (Wajib)</label>
                            <div class="input-icon-wrapper">
                                <Lock :size="16" class="icon-input" />
                                <input v-model="form.oldPassword" type="password" class="input-field with-icon input-required-visual"
                                    placeholder="Masukkan password saat ini untuk simpan perubahan" required />
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label>Password Baru (Opsional)</label>
                            <div class="input-icon-wrapper">
                                <Lock :size="16" class="icon-input" />
                                <input v-model="form.password" type="password" class="input-field with-icon"
                                    placeholder="Isi hanya jika ingin mengganti password" />
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" :disabled="isLoading" class="btn-save">
                            <Save :size="18" />
                            {{ isLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* === LAYOUT UTAMA === */
.page-container {
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
}

.animate-fade {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* === CARD === */
.card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    padding: 2.5rem;
    transition: background 0.3s;
}
/* Mode Dark: Slate-800 sesuai tabel Links */
:global(.dark) .card {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
}

.grid-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 3rem;
}

@media (max-width: 768px) {
    .grid-layout {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
}

/* === AVATAR SIDEBAR === */
.avatar-sidebar {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.avatar-wrapper {
    position: relative;
    width: 140px;
    height: 140px;
}

.avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #fff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
:global(.dark) .avatar-img {
    border-color: #334155 !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.btn-camera {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background: #3b82f6;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10;
}

.btn-camera:hover {
    transform: scale(1.1);
    background: #2563eb;
}

.role-badge {
    display: inline-block;
    background: #0f172a;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-top: 8px;
}
:global(.dark) .role-badge {
  background: #3b82f6 !important; 
}

/* === FORM SECTION === */
.form-section {
    display: flex;
    flex-direction: column;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.full-width {
    grid-column: span 2;
}

.form-group label {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
    color: #475569;
    margin-bottom: 0.5rem;
}
:global(.dark) .form-group label {
    color: #cbd5e1 !important;
}

.help-text {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 4px;
    display: block;
}

/* === INPUT FIELDS (RESTORED BASE STYLES) === */
.input-field {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    font-size: 0.95rem;
    background: #ffffff;
    color: #1e293b;
    transition: all 0.2s;
}

.input-field:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.input-disabled {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f1f5f9;
    color: #64748b;
    cursor: not-allowed;
    font-size: 0.95rem;
}

.input-required-visual {
    border: 1px solid #fecaca !important;
    background-color: #fffafb !important;
}

/* === DARK MODE OVERRIDES (PREMIUM SLATE) === */
:global(html.dark) .input-field {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

:global(html.dark) .input-field:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
}

:global(html.dark) .input-required-visual {
    border-color: #7f1d1d !important;
    background-color: #0f172a !important;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.1) !important;
}

:global(html.dark) .input-disabled {
    background: #1e293b !important;
    color: #94a3b8 !important;
    border-color: #334155 !important;
}

:global(html.dark) .card {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
}

:global(html.dark) .avatar-img {
    border-color: #334155 !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5) !important;
}

:global(html.dark) .role-badge {
    background: #3b82f6 !important;
}

:global(html.dark) .form-group label {
    color: #cbd5e1 !important;
}

.input-icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}
.icon-input {
    position: absolute;
    left: 12px;
    color: #94a3b8;
}
.input-field.with-icon {
    padding-left: 40px;
}

/* === BUTTONS & ALERTS === */
.form-actions {
    margin-top: 2rem;
}

.btn-save {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.8rem 1.8rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}
.btn-save:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
}
.btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.alert {
    padding: 0.8rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 2rem;
    text-align: center;
}
.alert.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}
:global(.dark) .alert.success {
    background: rgba(16, 185, 129, 0.15) !important;
    color: #6ee7b7 !important;
    border-color: rgba(16, 185, 129, 0.3) !important;
}
.alert.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
}
:global(.dark) .alert.error {
    background: rgba(239, 68, 68, 0.15) !important;
    color: #fca5a5 !important;
    border-color: rgba(239, 68, 68, 0.3) !important;
}
</style>
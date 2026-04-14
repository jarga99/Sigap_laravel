<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../lib/axios'
import { User, Camera, Save, Lock, Briefcase } from 'lucide-vue-next'
import { API_BASE_URL } from '../lib/config'

const authStore = useAuthStore()
const API_URL = API_BASE_URL
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

// State Form
const form = ref({
    fullName: '',
    password: '',
    email: '',
    subdivision: 'Memuat...', // Placeholder saat loading
    username: ''
})

// State untuk Gambar
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// --- FUNGSI BARU: Mengambil Nama Kategori ---
const fetchCategoryName = async () => {
    // 1. Cek jika User adalah ADMIN
    if (authStore.user?.role === 'ADMIN') {
        form.value.subdivision = 'Tidak Ada (Super Admin)'
        return
    }

    // 2. Ambil ID Departemen user
    const deptId = authStore.user?.departmentId

    if (!deptId) {
        form.value.subdivision = '-'
        return
    }

    // 3. Fetch Kategori dari API untuk mencocokkan nama
    try {
        const res = await api.get('/categories')
        const categories = res.data
        const found = categories.find((c: any) => Number(c.id) === Number(deptId))

        if (found) {
            form.value.subdivision = found.name
        } else {
            console.warn('Category not found for ID:', deptId)
            form.value.subdivision = '-'
        }
    } catch (err) {
        console.error('Gagal load kategori', err)
        form.value.subdivision = 'Gagal memuat data'
    }
}

// Load data awal saat komponen dipasang
onMounted(async () => {
    if (authStore.user) {
        form.value.fullName = authStore.user.fullName || ''
        form.value.username = authStore.user.username || ''
        form.value.email = authStore.user.email || ''

        // --- PERBAIKAN DI SINI: Membangun URL Preview yang benar ---
        if (authStore.user.image_url) {
            const fileName = authStore.user.image_url.split('/').pop()
            previewImage.value = `${API_URL}/uploads/profiles/${fileName}`
        } else {
            previewImage.value = null
        }

        // Panggil fungsi pencari nama departemen
        await fetchCategoryName()
    }
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

        // Buat preview lokal
        const reader = new FileReader()
        reader.onload = (e) => {
            previewImage.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
}

// Simpan Perubahan
const saveProfile = async () => {
    // 1. Reset state
    isLoading.value = true
    message.value = ''
    isError.value = false
    const API_URL = API_BASE_URL

    try {
        // 2. Siapkan FormData
        const formData = new FormData()
        formData.append('fullName', form.value.fullName)
        formData.append('email', form.value.email)
        formData.append('type', 'profiles')

        if (form.value.password) {
            formData.append('password', form.value.password)
        }

        // CEK: Apakah file benar-benar dipilih oleh user?
        if (selectedFile.value) {
            // 'image' harus sama persis dengan yang dipanggil Backend (formData.get('image'))
            formData.append('image', selectedFile.value)
            console.log("Mengirim file:", selectedFile.value.name)
        } else {
            console.log("Tidak ada file yang dipilih untuk diupload")
        }

        // 3. Kirim ke Backend
        const res = await api.put('/users/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        // 4. Proses Sinkronisasi Setelah Berhasil
        const userData = res.data.user

        // Ambil hanya nama filenya saja (pop) untuk mencegah URL ganda
        // Misal dari "/uploads/profiles/123.jpg" menjadi "123.jpg"
        let fileNameOnly = ""
        if (userData.image_url) {
            fileNameOnly = userData.image_url.split('/').pop()
        }

        // Update Pinia Store & LocalStorage
        authStore.updateUser({
            ...userData,
            image_url: fileNameOnly // Simpan versi bersih
        })

        // Update preview di halaman profil agar gambar langsung berubah
        if (fileNameOnly) {
            previewImage.value = `${API_URL}/uploads/profiles/${fileNameOnly}`
        }

        message.value = 'Profil berhasil diperbarui!'
        form.value.password = ''
        selectedFile.value = null

    } catch (error: any) {
        console.error("Kesalahan Update Profil:", error)
        isError.value = true
        message.value = error.response?.data?.error || 'Gagal memperbarui profil'
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="page-container animate-fadeup">
        <div class="profile-card">
            <div class="card-header">
                <h2>Pengaturan Akun</h2>
                <p>Kelola informasi profil dan keamanan akun Anda.</p>
            </div>

            <div class="card-body">
                <div class="avatar-section">
                    <div class="avatar-wrapper">
                        <img :src="previewImage || `https://ui-avatars.com/api/?name=${form.username}&background=eff6ff&color=3b82f6`"
                            alt="Profile" class="avatar-img" />
                        <button @click="triggerFileInput" class="btn-camera" title="Ganti Foto">
                            <Camera :size="18" />
                        </button>
                        <input ref="fileInput" type="file" accept="image/*" class="hidden-input"
                            @change="handleFileChange" />
                    </div>
                    <p class="role-badge">{{ authStore.user?.role }}</p>
                </div>

                <form @submit.prevent="saveProfile" class="form-section">

                    <div v-if="message" :class="['alert', isError ? 'alert-error' : 'alert-success']">
                        {{ message }}
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Username</label>
                            <div class="input-icon">
                                <User :size="18" />
                                <input v-model="form.username" disabled class="input-disabled" />
                            </div>
                            <small>Username tidak dapat diubah.</small>
                        </div>

                        <div class="form-group">
                            <label>Kategori</label>
                            <div class="input-icon">
                                <Briefcase :size="18" />
                                <input v-model="form.subdivision" disabled class="input-disabled" />
                            </div>
                            <small>Hubungi Admin untuk pindah kategori.</small>
                        </div>

                        <div class="form-group full-width">
                            <label>Nama Lengkap</label>
                            <input v-model="form.fullName" type="text" placeholder="Masukkan nama lengkap" />
                        </div>

                        <div class="form-group full-width">
                            <label>Email Utama (Untuk Login Google) 📧</label>
                            <input v-model="form.email" type="email" placeholder="contoh@gmail.com" />
                            <small>Penting: Hanya email ini yang diizinkan untuk masuk via 'Login with Google'.</small>
                        </div>

                        <div class="form-group full-width">
                            <label>Password Baru (Opsional)</label>
                            <div class="input-icon">
                                <Lock :size="18" />
                                <input v-model="form.password" type="password"
                                    placeholder="Isi hanya jika ingin mengganti password login normal" />
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
.page-container {
    padding: 2rem;
    max-width: 1200px; /* Diperlebar dari 900px */
    margin: 0 auto;
}

.profile-card {
    background: var(--card-bg);
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    color: var(--text-main);
    border: 1px solid var(--card-border);
}

.card-header {
    padding: 2rem;
    background: var(--bg-main);
    border-bottom: 1px solid var(--card-border);
}

.card-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-main);
}

.card-header p {
    margin: 5px 0 0;
    color: var(--text-muted);
}

.card-body {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
    padding: 2rem;
}

@media (max-width: 768px) {
    .card-body {
        grid-template-columns: 1fr;
    }
}

/* Avatar Styles */
.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.avatar-wrapper {
    position: relative;
    width: 150px;
    height: 150px;
}

.avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid var(--card-bg);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
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
}

.btn-camera:hover {
    transform: scale(1.1);
    background: #2563eb;
}

.hidden-input {
    display: none;
}

.role-badge {
    background: #0f172a;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
}

/* Form Styles */
.form-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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
    font-size: 0.9rem;
    color: var(--text-main);
    margin-bottom: 0.5rem;
}

.form-group small {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 4px;
    display: block;
}

.input-icon {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon svg {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
}

.input-icon input {
    padding-left: 40px;
}

input {
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1px solid var(--card-border);
    border-radius: 8px;
    font-size: 0.95rem;
    background: var(--input-bg);
    color: var(--text-main);
    transition: border-color 0.2s;
}

input:focus {
    border-color: #3b82f6;
    outline: none;
}

.input-disabled {
    background: var(--bg-main);
    color: var(--text-muted);
    cursor: not-allowed;
}

.btn-save {
    background: #0f172a;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
}

.btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.alert {
    padding: 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
}

.alert-success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.alert-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
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
</style>
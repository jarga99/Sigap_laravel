<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/axios'
import { API_BASE_URL } from '../lib/config'

const route = useRoute()

onMounted(() => {
  const slug = route.params.slug as string

  if (!slug) {
    window.location.href = '/'
    return
  }

  // 1. Ambil URL backend dari konfigurasi pusat
  const backendBaseUrl = API_BASE_URL

  // 2. Langsung lempar browser ke rute Next.js yang sudah punya fitur Tracking & Redirect!
  // window.location.replace lebih baik dari href agar user tidak bisa klik tombol "Back" ke halaman blank ini
  window.location.replace(`${backendBaseUrl}/s/${slug}`)
})
</script>

<template>
  <div class="redirect-loading">
    <div class="spinner"></div>
    <p>Memproses layanan, mohon tunggu...</p>
  </div>
</template>

<style scoped>
.redirect-loading {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f8fafc;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../lib/axios'
import QRCode from 'qrcode'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import * as LucideIcons from 'lucide-vue-next'
import { 
  Instagram, 
  Globe, 
  MessageCircle, 
  AlertCircle, 
  Loader2,
  QrCode,
  Download,
  Copy,
  Check,
  X,
  Settings,
  Eye,
  ShieldAlert
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const event = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// --- QR CODE STATE & DRAGGABLE LOGIC ---
const showQrModal = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const copied = ref(false)
const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square', // square, circle
  cornerShape: 'square', // square, rounded
  errorLevel: 'M' // L, M, Q, H
})

const currentUrl = computed(() => window.location.href)

const isDragging = ref(false)
const qrBtnPos = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })

const initQrPos = () => {
  const saved = localStorage.getItem('qr_btn_pos')
  if (saved) {
    qrBtnPos.value = JSON.parse(saved)
  }
}

const onDragStart = (e: MouseEvent | TouchEvent) => {
  isDragging.value = false
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  
  startPos.value = { x: clientX, y: clientY }
  
  const moveHandler = (mE: MouseEvent | TouchEvent) => {
    const mX = 'touches' in mE ? mE.touches[0].clientX : (mE as MouseEvent).clientX
    const mY = 'touches' in mE ? mE.touches[0].clientY : (mE as MouseEvent).clientY
    
    const deltaX = startPos.value.x - mX
    const deltaY = startPos.value.y - mY
    
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      isDragging.value = true
    }
    
    if (isDragging.value) {
      // Inversi karena menggunakan right & bottom
      qrBtnPos.value.x += deltaX
      qrBtnPos.value.y += deltaY
      startPos.value = { x: mX, y: mY }
    }
  }
  
  const stopHandler = () => {
    window.removeEventListener('mousemove', moveHandler as any)
    window.removeEventListener('mouseup', stopHandler)
    window.removeEventListener('touchmove', moveHandler as any)
    window.removeEventListener('touchend', stopHandler)
    if (isDragging.value) {
      localStorage.setItem('qr_btn_pos', JSON.stringify(qrBtnPos.value))
    }
  }
  
  window.addEventListener('mousemove', moveHandler as any)
  window.addEventListener('mouseup', stopHandler)
  window.addEventListener('touchmove', moveHandler as any)
  window.addEventListener('touchend', stopHandler)
}

const handleQrBtnClick = () => {
  if (!isDragging.value) {
    generateQR()
  }
}

const apiBase = import.meta.env.VITE_API_URL || '/api'

const fetchEventData = async () => {
  try {
    const slug = route.params.slug
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    
    const res = await axios.get(`${apiBase}/public/events/${slug}`, { headers })
    event.value = res.data
  } catch (err: any) {
    console.error(err)
    error.value = err.response?.data?.error || 'Halaman tidak ditemukan'
  } finally {
    isLoading.value = false
  }
}

const handleLinkClick = async (e: MouseEvent, item: any) => {
  // If event is not active, show warning but allow navigation if confirmed (for admin testing)
  if (event.value && event.value.status !== 'AKTIF') {
    e.preventDefault()
    if (confirm(`Peringatan: Link ini berstatus ${event.value.status}. \n\nPublik tidak akan bisa melihat atau mengklik link ini. Apakah Anda ingin tetap lanjut mengetes link ini?`)) {
      window.open(item.url, '_blank')
    }
    return
  }

  // Record click asynchronously (Normal Path)
  try {
    await axios.post(`${apiBase}/public/events/click`, { itemId: item.id })
  } catch (err) {
    console.error('Failed to log click', err)
  }
}

const bgStyle = computed(() => {
  if (!event.value) return {}
  if (event.value.bgType === 'image') {
    return {
      backgroundImage: `url(${event.value.bgValue})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {
    backgroundColor: event.value.bgValue
  }
})

onMounted(() => {
  fetchEventData()
  initQrPos()
})

const getSocialIcon = (url: string) => {
  if (!url) return Globe
  const low = url.toLowerCase()
  if (low.includes('instagram.com')) return Instagram
  if (low.includes('wa.me') || low.includes('whatsapp.com')) return MessageCircle
  return Globe
}

const getButtonIcon = (iconName: string) => {
  if (!iconName) return null
  return (LucideIcons as any)[iconName] || null
}

const fontLink = computed(() => {
  if (!event.value) return ''
  const fonts = [event.value.titleFont, event.value.descFont, event.value.footerFont]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .map(f => f.replace(/ /g, '+'))
  if (fonts.length === 0) return ''
  return `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}:wght@400;700;900`).join('&')}&display=swap`
})

// --- QR CODE LOGIC ---
const generateQR = () => {
  showQrModal.value = true
  setTimeout(renderCanvas, 100)
}

const renderCanvas = async () => {
  if (!qrCanvas.value) return

  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  try {
    const qrData = QRCode.create(currentUrl.value, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
    const { modules } = qrData
    const moduleCount = modules.size
    const margin = 4
    const size = 400
    const cellSize = size / (moduleCount + margin * 2)

    canvas.width = size
    canvas.height = size

    // Colors
    ctx.fillStyle = qrOptions.value.bgColor
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = qrOptions.value.color

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize
          const y = (row + margin) * cellSize

          const isTopLeft = row < 7 && col < 7
          const isTopRight = row < 7 && col >= moduleCount - 7
          const isBottomLeft = row >= moduleCount - 7 && col < 7

          if ((isTopLeft || isTopRight || isBottomLeft) && qrOptions.value.cornerShape === 'rounded') {
            ctx.beginPath()
            ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2)
            ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
            ctx.beginPath()
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.45, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, cellSize, cellSize)
          }
        }
      }
    }
  } catch (err) {
    console.error('QR Render Error:', err)
  }
}

const downloadQR = () => {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `QR-${event.value?.title || 'Event'}.png`
  link.click()
}

const copyLink = () => {
  navigator.clipboard.writeText(currentUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

import { watch } from 'vue'
watch(qrOptions, renderCanvas, { deep: true })
</script>

<template>
  <div class="event-landing-container" :style="bgStyle">
    <!-- 🚧 PREVIEW BANNER FOR ADMINS -->
    <div v-if="event && event.status !== 'AKTIF'" class="preview-mode-banner">
      <div class="banner-content">
        <ShieldAlert :size="18" class="text-white animate-pulse" />
        <div class="text-left">
          <p class="banner-title">MODE PRATINJAU ADMIN</p>
          <p class="banner-desc">Status: <strong>{{ event.status }}</strong>. Publik tidak dapat melihat halaman ini (403 Forbidden).</p>
        </div>
      </div>
      <div class="banner-badge">Hanya Anda</div>
    </div>

    <!-- Dynamic Font Loading -->
    <link v-if="fontLink" rel="stylesheet" :href="fontLink" />

    <div v-if="isLoading" class="state-container">
      <Loader2 class="spinner" :size="48" color="#ffffff" />
      <p>Memuat event...</p>
    </div>

    <div v-else-if="error" class="state-container">
      <AlertCircle :size="64" color="#ef4444" />
      <h2 class="text-2xl font-bold mt-4">{{ error }}</h2>
      <p class="mt-2 text-slate-300">Mohon cek kembali link yang Anda buka.</p>
    </div>

    <div v-else class="content-wrapper">
      <!-- Header Section -->
      <div v-if="event.showProfile !== false || event.showCover !== false || event.showTitle !== false || event.showDescription !== false" 
           class="header-section-social w-full transition-all duration-500">
        
        <!-- Banner Sampul -->
        <div v-if="event.showCover !== false" class="cover-banner-wrap !w-full" 
             :style="{ 
               height: (event.coverHeight || 180) + 'px',
               maxHeight: '40vh' 
             }">
          <img v-if="event.eventPhoto" :src="event.eventPhoto" class="cover-image" alt="Cover" />
          <div v-else class="cover-placeholder"></div>
        </div>

        <!-- Foto Profil & Info -->
        <div class="header-content-inner flex flex-col items-center px-6" 
             :class="{ 
               '-mt-12': event.showCover !== false && event.showProfile !== false,
               'pt-12': event.showCover === false,
               'pt-6': event.showCover === false && event.showProfile === false
             }">
          
          <!-- Foto Profil -->
          <div v-if="event.showProfile !== false && event.profilePhoto" 
               class="profile-img-box-overlap mb-6"
               :style="{ 
                  width: (event.profileWidth || 120) + 'px',
                  height: (event.profileHeight || 120) + 'px',
                  maxWidth: 'min(90vw, ' + (event.profileWidth || 120) + 'px)',
                  maxHeight: 'min(90vw, ' + (event.profileHeight || 120) + 'px)',
                  borderRadius: event.profileShape === 'circle' ? '50%' : '24px',
                  border: event.profileBorderStyle === 'outline' ? 'none' : `${event.profileBorderWidth || 4}px ${event.profileBorderStyle || 'solid'} ${event.profileBgColor || '#ffffff'}`,
                  boxShadow: event.profileBorderStyle === 'outline' ? `0 0 0 ${event.profileBorderWidth || 4}px ${event.profileBgColor || '#ffffff'}` : '0 10px 30px rgba(0,0,0,0.5)',
                  backgroundColor: event.profileBgColor || '#ffffff'
               }">
            <img :src="event.profilePhoto" 
                 alt="Profile" 
                 class="w-full h-full object-cover"
                 :style="{ borderRadius: event.profileShape === 'circle' ? '50%' : '16px' }" />
          </div>

          <!-- Title & Description -->
          <div class="header-info text-center w-full">
            <h1 v-if="event.showTitle !== false" class="event-title" :style="{ color: event.titleColor, fontFamily: event.titleFont }">{{ event.title }}</h1>
            <p v-if="event.showDescription !== false && event.description" class="event-desc" :style="{ color: event.descColor, fontFamily: event.descFont }">{{ event.description }}</p>
          </div>
        </div>
      </div>

      <!-- Spacing if Header is fully hidden -->
      <div v-if="event.showCover === false && event.showProfile === false && event.showTitle === false && event.showDescription === false" class="pt-20"></div>

      <!-- Links List -->
      <div class="links-list mt-8">
        <template v-for="item in event.items" :key="item.id">
          <!-- Filter Inactive Items in Public View -->
          <template v-if="item.isActive !== false">
            <!-- BUTTON TYPE -->
            <a 
              v-if="item.type === 'BUTTON'"
              :href="item.url" 
              target="_blank" 
              class="link-button relative overflow-hidden"
              :class="{ 'preview-locked': event.status !== 'AKTIF' }"
              :style="{ 
                backgroundColor: item.color, 
                color: item.textColor,
                borderRadius: event.buttonShape === 'square' ? '4px' : (event.buttonShape === 'rounded' ? (event.buttonRadius + 'px') : '12px'),
                padding: item.layout.includes('edge') ? '1rem 1.5rem' : '1rem'
              }"
              @click="handleLinkClick($event, item)"
            >
              <div class="btn-inner" :class="{ 
                'flex-row-reverse': item.layout === 'icon-right' || item.layout === 'icon-edge-right',
                'justify-between': item.layout === 'icon-edge-left' || item.layout === 'icon-edge-right'
              }">
                <component v-if="item.layout !== 'text-only'" :is="getButtonIcon(item.icon)" :size="20" :style="{ color: item.iconColor }" class="flex-shrink-0" />
                <span :class="{ 'flex-1 text-center': item.layout.includes('edge') || item.layout === 'text-only' || item.layout === 'icon-left' || item.layout === 'icon-right' }" class="font-black">{{ item.label }}</span>
                <div v-if="item.layout.includes('edge')" class="w-5 h-5 invisible"></div>
              </div>
            </a>

            <!-- DIVIDER TYPE -->
            <div v-else-if="item.type === 'DIVIDER'" class="divider-wrapper py-6">
               <div class="w-full flex items-center gap-4">
                  <div class="flex-1 opacity-20" :style="{ backgroundColor: item.color, height: (item.order || 1) + 'px' }"></div>
                  <span v-if="item.label" class="text-[10px] font-black uppercase tracking-[0.2em] px-2" :style="{ color: item.color }">{{ item.label }}</span>
                  <div class="flex-1 opacity-20" :style="{ backgroundColor: item.color, height: (item.order || 1) + 'px' }"></div>
               </div>
            </div>
          </template>
        </template>
      </div>

      <!-- Social Icons -->
      <div class="social-wrapper py-8">
        <template v-for="item in event.items" :key="'soc-'+item.id">
          <!-- Filter Inactive Items in Social View -->
          <template v-if="item.isActive !== false">
            <a 
              v-if="item.type === 'SOCIAL'"
              :href="item.url" 
              class="social-link-v2"
              :style="{ 
                backgroundColor: item.color, 
                color: item.textColor,
                borderRadius: event.buttonShape === 'square' ? '4px' : (event.buttonShape === 'rounded' ? (event.buttonRadius + 'px') : '12px'),
                width: item.layout === 'icon-only' ? '56px' : '100%',
                padding: item.layout.includes('edge') ? '12px 20px' : '12px 18px'
              }"
              :class="{ 
                'justify-center': item.layout === 'icon-only',
                'justify-between': item.layout === 'icon-edge-left' || item.layout === 'icon-edge-right',
                'flex-row-reverse': item.layout === 'icon-right' || item.layout === 'icon-edge-right',
                'preview-locked': event.status !== 'AKTIF'
              }"
              @click="handleLinkClick($event, item)"
            >
              <div class="flex items-center gap-3 w-full" :class="{ 'flex-row-reverse': item.layout === 'icon-right' || item.layout === 'icon-edge-right' }">
                <component :is="getButtonIcon(item.icon?.split('|')[0])" :size="20" :style="{ color: item.iconColor }" />
                <span v-if="item.layout !== 'icon-only' && item.showLabel !== false" 
                      class="font-black text-sm uppercase tracking-tight"
                      :class="{ 'flex-1 text-center': item.layout.includes('edge') }">
                  {{ item.label }}
                </span>
                <div v-if="item.layout.includes('edge')" class="w-5 h-5 invisible"></div>
              </div>
            </a>
          </template>
        </template>
      </div>

      <!-- Footer -->
      <div v-if="event.showFooter !== false" class="event-footer !border-none">
        <p v-if="event.footerText" class="custom-footer-text" :style="{ color: event.footerColor, fontFamily: event.footerFont }">{{ event.footerText }}</p>
        <div class="system-branding opacity-40">
           <div class="sys-name">© {{ new Date().getFullYear() }} SIGAP PROJECT</div>
           <div class="dev-info">Powered by Advanced Event Engine</div>
        </div>
      </div>
    </div>

    <!-- Floating QR Button (Mirrored from Feedback Button Style) -->
    <button v-if="!isLoading && !error" 
      @mousedown="onDragStart"
      @touchstart="onDragStart"
      @click="handleQrBtnClick"
      class="floating-qr-draggable"
      :class="[isDragging ? 'dragging' : '']"
      :style="{ 
        right: `calc(1.5rem + ${qrBtnPos.x}px)`, 
        bottom: `calc(1.5rem + ${qrBtnPos.y}px)` 
      }">
      <QrCode :size="22" class="qr-icon" />
      <span class="floating-tooltip">
        Bagikan Event
      </span>
    </button>

    <!-- QR Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showQrModal" class="qr-modal-overlay" @click.self="showQrModal = false">
          <div class="qr-modal-content">
            <div class="qr-modal-header">
              <div class="header-info-qr">
                <h3>Bagikan Event</h3>
                <p>Scan atau kustomisasi kode QR</p>
              </div>
              <button @click="showQrModal = false" class="qr-close-btn">
                <X :size="20" />
              </button>
            </div>

            <div class="qr-modal-body">
              <div class="qr-preview-section">
                <div class="qr-canvas-wrap">
                  <canvas ref="qrCanvas"></canvas>
                </div>
                <div class="qr-url-display">
                  <span>{{ currentUrl }}</span>
                  <button @click="copyLink" :class="{ 'copied': copied }">
                    <Check v-if="copied" :size="16" />
                    <Copy v-else :size="16" />
                  </button>
                </div>
              </div>

              <div class="qr-settings-section">
                <div class="setting-group">
                  <label><Settings :size="14" /> Bentuk Titik</label>
                  <select v-model="qrOptions.shape">
                    <option value="square">Kotak (Standar)</option>
                    <option value="circle">Bulat (Modern)</option>
                  </select>
                </div>

                <div class="setting-group">
                  <label><Settings :size="14" /> Model Sudut</label>
                  <select v-model="qrOptions.cornerShape">
                    <option value="square">Standard</option>
                    <option value="rounded">Rounded</option>
                  </select>
                </div>

                <div class="setting-group">
                  <label><Settings :size="14" /> Warna Dasar</label>
                  <div class="color-pickers">
                    <div class="picker">
                      <span>QR</span>
                      <input type="color" v-model="qrOptions.color" />
                    </div>
                    <div class="picker">
                      <span>Bg</span>
                      <input type="color" v-model="qrOptions.bgColor" />
                    </div>
                  </div>
                </div>

                <button @click="downloadQR" class="qr-download-btn">
                  <Download :size="20" /> SIMPAN QR CODE
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.event-landing-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  padding: 2rem 1rem;
  font-family: 'Inter', sans-serif;
}

.state-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.content-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-section-social {
  width: 100%;
  text-align: center;
  margin-bottom: 3rem;
}

.cover-banner-wrap {
  width: 100%;
  height: 250px;
  overflow: hidden;
  position: relative;
}

@media (max-width: 768px) {
  .cover-banner-wrap { min-height: 120px; }
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

.profile-img-box-overlap {
  width: 120px;
  height: 120px;
  margin: -60px auto 0;
  position: relative;
  z-index: 10;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.profile-img-box-overlap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-section {
  text-align: center;
  margin-bottom: 2.5rem;
  width: 100%;
  padding-top: 3rem;
}

.header-section.no-profile {
  margin-top: 1.5rem;
}

.event-title {
  font-size: 1.8rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.event-desc {
  font-size: 1rem;
  opacity: 0.8;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

.links-list {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 4rem;
  padding: 0 1.5rem;
}

.link-button {
  display: block;
  width: 100%;
  padding: 1rem;
  text-align: center;
  text-decoration: none;
  color: white;
  font-weight: 600;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-icon {
  opacity: 0.9;
}

.link-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  filter: brightness(1.1);
}

.social-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: auto;
  margin-bottom: 2.5rem;
  width: 100%;
  max-width: 600px;
  padding: 0 1.5rem;
}

.social-icon-btn {
  color: white;
  opacity: 0.9;
  transition: opacity 0.2s, transform 0.2s;
  text-decoration: none;
}

.social-icon-btn.has-label {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 50px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.soc-btn-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.soc-label {
  font-size: 0.85rem;
  font-weight: 700;
}

.social-icon-btn:hover {
  opacity: 1;
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.15);
}

/* Dividers */
.divider-wrapper {
  width: 100%;
  padding: 1rem 0;
  display: flex;
  justify-content: center;
}

.div-solid { height: 1px; width: 100%; opacity: 0.3; }
.div-dashed { border-bottom: 2px dashed; width: 100%; opacity: 0.3; }
.div-dots { font-size: 1.5rem; letter-spacing: 10px; line-height: 1; opacity: 0.6; }
.div-spacer { height: 30px; }
.div-text {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.7;
}

.div-text::before, .div-text::after {
  content: '';
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.2;
}

.event-footer {
  font-size: 0.75rem;
  opacity: 0.9;
  text-align: center;
  padding: 2rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  width: 100%;
  margin-top: 2rem;
}

.custom-footer-text {
  font-weight: 700;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.social-link-v2 {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.social-link-v2:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.system-branding {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sys-name {
  font-weight: 900;
  letter-spacing: 2px;
  font-size: 0.7rem;
  opacity: 0.8;
}

.dev-info {
  font-size: 0.6rem;
  opacity: 0.4;
  text-transform: uppercase;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .event-landing-container {
    padding: 1.5rem 1rem;
  }
}

/* --- QR CODE STYLES (MATCHING FEEDBACK BUTTON) --- */
.floating-qr-draggable {
  position: fixed;
  z-index: 9900;
  width: 56px;
  height: 56px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
  border: 4px solid rgba(255, 255, 255, 0.3);
  cursor: move;
  transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
}

@media (max-width: 640px) {
  .floating-qr-draggable {
    width: 48px;
    height: 48px;
    border-width: 3px;
  }
}

.floating-qr-draggable:not(.dragging) {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.floating-qr-draggable:hover:not(.dragging) {
  transform: translateY(-5px) scale(1.05);
  background: #1d4ed8;
  box-shadow: 0 15px 40px rgba(37, 99, 235, 0.5);
}

.floating-qr-draggable.dragging {
  cursor: grabbing;
  scale: 1.1;
  opacity: 0.9;
}

.qr-icon {
  transition: transform 0.3s;
}

.floating-qr-draggable:hover .qr-icon {
  transform: rotate(15deg);
}

.floating-tooltip {
  position: absolute;
  right: 100%;
  margin-right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  border-radius: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.floating-qr-draggable:hover .floating-tooltip {
  opacity: 1;
  transform: translateX(0);
}

.qr-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.qr-modal-content {
  background: #ffffff;
  width: 100%;
  max-width: 700px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.qr-modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info-qr h3 {
  font-size: 1.25rem;
  font-weight: 900;
  color: #0f172a;
}

.header-info-qr p {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.qr-close-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.qr-close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.qr-modal-body {
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 640px) {
  .qr-modal-body {
    grid-template-columns: 1fr;
  }
}

.qr-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.qr-canvas-wrap {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
}

.qr-canvas-wrap canvas {
  width: 100%;
  max-width: 200px;
  height: auto;
  border-radius: 8px;
}

.qr-url-display {
  width: 100%;
  background: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #f1f5f9;
}

.qr-url-display span {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qr-url-display button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
  cursor: pointer;
}

.qr-url-display button:hover {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.qr-url-display button.copied {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}

.qr-settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-group label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.setting-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
}

.setting-group select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.color-pickers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.picker {
  background: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker span {
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748b;
}

.picker input[type="color"] {
  border: none;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.qr-download-btn {
  margin-top: auto;
  width: 100%;
  padding: 1rem;
  background: #0f172a;
  color: white;
  border-radius: 16px;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
  cursor: pointer;
}

.qr-download-btn:hover {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.preview-locked {
  filter: grayscale(0.8) opacity(0.7);
  cursor: help !important;
  transition: all 0.3s;
}

.preview-locked:hover {
  filter: grayscale(0.2) opacity(0.9);
}

.preview-mode-banner {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  width: calc(100% - 2rem);
  max-width: 600px;
  background: rgba(220, 38, 38, 0.85); /* Red-600 with transparency */
  backdrop-blur: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1.25rem;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
  animation: slideDownIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDownIn {
  from { top: -5rem; opacity: 0; }
  to { top: 1rem; opacity: 1; }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-title {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: white;
  margin: 0;
}

.banner-desc {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.banner-badge {
  background: white;
  color: #dc2626;
  font-size: 9px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 50px;
  text-transform: uppercase;
}
</style>

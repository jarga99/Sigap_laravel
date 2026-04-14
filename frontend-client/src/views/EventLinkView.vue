<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import * as LucideIcons from 'lucide-vue-next'
import { 
  Instagram, 
  Globe, 
  MessageCircle, 
  AlertCircle, 
  Loader2
} from 'lucide-vue-next'

const route = useRoute()
const event = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

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

const handleLinkClick = async (item: any) => {
  // Record click asynchronously
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
</script>

<template>
  <div class="event-landing-container" :style="bgStyle">
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
              :style="{ 
                backgroundColor: item.color, 
                color: item.textColor,
                borderRadius: event.buttonShape === 'square' ? '4px' : (event.buttonShape === 'rounded' ? (event.buttonRadius + 'px') : '12px'),
                padding: item.layout.includes('edge') ? '1rem 1.5rem' : '1rem'
              }"
              @click="handleLinkClick(item)"
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
                'flex-row-reverse': item.layout === 'icon-right' || item.layout === 'icon-edge-right'
              }"
              @click="handleLinkClick(item)"
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
</style>

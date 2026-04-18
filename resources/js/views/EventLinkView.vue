<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/axios'
import SIGAPIcons from '../components/SIGAPIcons.vue'

const route = useRoute()
const event = ref<any>(null)
const isLoading = ref(true)
const settings = ref<any>({})

const fetchSettings = async () => {
  try {
    const res = await api.get('/settings')
    settings.value = res.data
  } catch (err) { console.error('Gagal mengambil settings') }
}

const fetchEvent = async () => {
  const slug = route.params.slug
  try {
    const res = await api.get(`/internal/events/${slug}`)
    event.value = res.data
  } catch (err) {
    console.error('Event tidak ditemukan')
  } finally {
    isLoading.value = false
  }
}

const getFontStack = (fontName: string) => {
  const fonts: Record<string, string> = {
    'Inter': "'Inter', sans-serif",
    'Poppins': "'Poppins', sans-serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Space Grotesk': "'Space Grotesk', sans-serif"
  }
  return fonts[fontName] || "'Inter', sans-serif"
}

const groupedItems = computed(() => {
  if (!event.value?.items) return []
  const result: any[] = []
  let currentSoc: any[] = []
  
  event.value.items
    .filter((it: any) => it.isActive)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    .forEach((item: any) => {
      if (item.type === 'SOCIAL' && item.layout === 'icon-only') {
        currentSoc.push(item)
      } else {
        if (currentSoc.length > 0) {
          result.push({ type: 'SOC_GROUP', items: [...currentSoc] })
          currentSoc = []
        }
        result.push(item)
      }
    })
    
  if (currentSoc.length > 0) {
    result.push({ type: 'SOC_GROUP', items: [...currentSoc] })
  }
  return result
})

onMounted(() => {
  fetchSettings()
  fetchEvent()
})
</script>

<template>
  <div v-if="isLoading" class="min-h-screen bg-slate-50 flex items-center justify-center">
    <div class="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
  </div>

  <div v-else-if="event" class="min-h-screen relative flex flex-col items-center overflow-x-hidden selection:bg-blue-100">
    
    <!-- BACKGROUND LAYER -->
    <div class="fixed inset-0 z-0">
       <!-- SOLID BG -->
       <div v-if="event.bgType === 'color'" class="absolute inset-0" :style="{ backgroundColor: event.bgValue, opacity: (event.bgOpacity ?? 100) / 100 }"></div>
       
       <!-- IMAGE BG -->
       <template v-if="event.bgType === 'image' && event.bgValue">
          <img :src="event.bgValue" class="absolute inset-0 w-full h-full object-cover z-0" />
          <!-- Overlay -->
          <div class="absolute inset-0 z-[1]" :style="{ backgroundColor: event.bgOverlayColor || '#000', opacity: (event.bgOpacity ?? 0) / 100 }"></div>
       </template>
    </div>

    <!-- Scrollable Content -->
    <div class="w-full max-w-2xl relative z-10 flex flex-col min-h-screen">
      
      <!-- Cover Photo -->
      <div v-if="event.showCover && event.eventPhoto" class="w-full shrink-0 shadow-lg" :style="{ height: (event.coverHeight || 140) + 'px' }">
        <img :src="event.eventPhoto" class="w-full h-full object-cover" />
      </div>

      <!-- Main Profile Section -->
      <div class="flex flex-col items-center px-8 text-center relative" :class="event.showCover ? (event.showProfile ? '-mt-12' : 'pt-8') : 'pt-16'">
        
        <!-- Profile Photo -->
        <div v-if="event.showProfile" 
             :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-[2rem]'"
             :style="{ 
               width: (event.profileWidth || 80) + 'px', 
               height: (event.profileHeight || 80) + 'px',
               border: event.profileBorderStyle !== 'none' ? `${event.profileBorderWidth || 2}px ${event.profileBorderStyle} ${event.profileBgColor || '#ffffff'}` : 'none'
             }"
             class="bg-white shadow-2xl overflow-hidden shrink-0 ring-4 ring-white/50">
          <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
             <SIGAPIcons name="User" :size="32" />
          </div>
        </div>

        <!-- Branding Info -->
        <div class="mt-6 space-y-2 w-full">
          <h1 v-if="event.showTitle" 
              :style="{ color: event.titleColor || '#1e293b', fontFamily: getFontStack(event.titleFont), textAlign: event.titleAlign || 'center' }"
              class="text-3xl font-black uppercase tracking-tight leading-none drop-shadow-sm w-full">
            {{ event.title }}
          </h1>
          <p v-if="event.showDescription" 
             :style="{ color: event.descColor || '#64748b', fontFamily: getFontStack(event.descFont), textAlign: event.descAlign || 'center' }"
             class="text-sm font-bold opacity-90 leading-relaxed w-full">
            {{ event.description }}
          </p>
        </div>

        <!-- Dynamic Item List -->
        <div class="px-8 space-y-4 pb-24 w-full relative z-10 overflow-x-hidden mt-8">
           <template v-for="(it, i) in groupedItems" :key="i">
              <!-- Social Icons Row -->
              <div v-if="it.type === 'SOC_GROUP'" class="flex flex-wrap justify-center gap-4 py-3">
                 <a v-for="(s, si) in it.items" :key="'s'+si"
                    :href="s.url" target="_blank"
                    :style="{ backgroundColor: s.color, borderRadius: event.buttonShape === 'square' ? '8px' : '50%' }"
                    class="w-12 h-12 flex items-center justify-center shadow-xl transform hover:scale-110 active:scale-95 transition-all">
                      <SIGAPIcons :name="s.icon || 'Instagram'" :size="22" :style="{ color: s.iconColor }" />
                 </a>
              </div>

              <!-- Standard Button -->
              <a v-else-if="it.type === 'BUTTON' || (it.type === 'SOCIAL' && it.layout !== 'icon-only')"
                 :href="it.url" target="_blank"
                 :style="{ 
                   backgroundColor: it.color, 
                   color: it.textColor,
                   borderRadius: (event.buttonShape === 'square' ? 8 : (event.buttonRadius || 16)) + 'px'
                 }"
                 class="group relative flex items-center w-full p-4 shadow-xl shadow-black/5 transform hover:-translate-y-1 active:scale-[0.98] transition-all overflow-hidden border border-white/10">
                 
                 <!-- Icon Positioning -->
                 <div v-if="it.layout === 'icon-left' || it.layout === 'icon-edge-left'" 
                      :class="it.layout === 'icon-edge-left' ? 'mr-auto' : 'mr-4'"
                      class="shrink-0">
                    <SIGAPIcons :name="it.icon || 'Link'" :size="22" :style="{ color: it.iconColor }" />
                 </div>

                 <span class="flex-1 font-black uppercase tracking-widest text-xs text-center">{{ it.label }}</span>

                 <div v-if="it.layout === 'icon-right' || it.layout === 'icon-edge-right'" 
                      :class="it.layout === 'icon-edge-right' ? 'ml-auto' : 'ml-4'"
                      class="shrink-0">
                    <SIGAPIcons :name="it.icon || 'Link'" :size="22" :style="{ color: it.iconColor }" />
                 </div>

                 <!-- Shine Effect -->
                 <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <!-- Divider Line -->
              <div v-else-if="it.type === 'DIVIDER'" class="py-6 flex justify-center w-full overflow-hidden">
                 <div v-if="it.dividerStyle === 'spacer'" :style="{ height: it.order + 'px' }" class="w-full"></div>
                 <div v-else class="flex items-center justify-center gap-4 mx-auto" :style="{ width: (it.dividerWidth || 100) + '%' }">
                    <div class="flex-1" :style="{ 
                       borderTop: it.dividerStyle !== 'solid' ? `${it.order}px ${it.dividerStyle} ${it.color}` : 'none',
                       height: it.dividerStyle === 'solid' ? it.order + 'px' : '0px',
                       backgroundColor: it.dividerStyle === 'solid' ? it.color : 'transparent',
                       borderRadius: it.dividerCap === 'rounded' ? '999px' : '0px',
                       WebkitMaskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' : 'none',
                       maskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' : 'none'
                    }"></div>
                    <span v-if="it.dividerText" :style="{ color: it.color }" class="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{{ it.dividerText }}</span>
                    <div v-if="it.dividerText" class="flex-1" :style="{ 
                       borderTop: it.dividerStyle !== 'solid' ? `${it.order}px ${it.dividerStyle} ${it.color}` : 'none',
                       height: it.dividerStyle === 'solid' ? it.order + 'px' : '0px',
                       backgroundColor: it.dividerStyle === 'solid' ? it.color : 'transparent',
                       borderRadius: it.dividerCap === 'rounded' ? '999px' : '0px',
                       WebkitMaskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to left, transparent, black 15%, black 85%, transparent)' : 'none',
                       maskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to left, transparent, black 15%, black 85%, transparent)' : 'none'
                    }"></div>
                 </div>
              </div>
           </template>
        </div>

        <!-- Spacer for Footer -->
        <div class="flex-1"></div>

        <!-- Footer Section -->
        <footer v-if="event.showFooter" 
                class="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-auto">
           <div class="w-full flex flex-col items-center py-12 px-8 space-y-8 relative">
              <!-- Footer BG Layer with Opacity -->
              <div class="absolute inset-0 z-0" :style="{ backgroundColor: event.footerBgColor || 'transparent', opacity: (event.footerBgOpacity ?? 100) / 100 }"></div>
              
              <!-- Footer Text Message -->
              <p v-if="event.footerText" 
                 :style="{ color: event.footerColor || '#94a3b8', fontFamily: getFontStack(event.footerFont), textAlign: event.footerAlign || 'center' }"
                 class="text-[11px] font-black uppercase tracking-[0.2em] leading-loose max-w-md whitespace-pre-wrap opacity-80 relative z-10 w-full">
                {{ event.footerText }}
              </p>

              <!-- Copyright & Powered By -->
              <div v-if="event.showSystemBranding" class="flex flex-col gap-4 relative z-10 w-full" :style="{ textAlign: event.footerAlign || 'center' }">
                 <div class="flex items-center gap-3" :class="{ 'justify-center': (event.footerAlign || 'center') === 'center', 'justify-start': event.footerAlign === 'left', 'justify-end': event.footerAlign === 'right' }">
                    <div class="w-8 h-[1px]" :style="{ backgroundColor: event.footerColor || '#94a3b8' }" style="opacity:0.3"></div>
                    <span class="text-[9px] font-black uppercase tracking-widest" :style="{ color: event.footerColor || '#94a3b8' }" style="opacity:0.5">{{ event.customBranding || 'SIGAP' }} &copy; {{ new Date().getFullYear() }}</span>
                    <div class="w-8 h-[1px]" :style="{ backgroundColor: event.footerColor || '#94a3b8' }" style="opacity:0.3"></div>
                 </div>
                 <div class="flex flex-col gap-1 opacity-40 hover:opacity-100 transition-opacity" :class="{ 'items-center': (event.footerAlign || 'center') === 'center', 'items-start': event.footerAlign === 'left', 'items-end': event.footerAlign === 'right' }">
                    <span class="text-[7px] font-bold uppercase tracking-tighter" :style="{ color: event.footerColor || '#94a3b8' }">Powered By Platform</span>
                    <h5 class="text-xs font-black tracking-tighter uppercase" :style="{ color: event.footerColor || '#94a3b8' }">{{ event.customPoweredBy || 'Sigap Engine' }}</h5>
                 </div>
              </div>
           </div>
        </footer>

      </div>
    </div>

  </div>

  <div v-else class="min-h-screen flex items-center justify-center">
    <div class="text-center space-y-4">
      <SIGAPIcons name="AlertCircle" :size="48" class="text-slate-300 mx-auto" />
      <h1 class="text-xl font-bold text-slate-400">Event tidak ditemukan</h1>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>

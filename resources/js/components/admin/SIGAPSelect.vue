<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import SIGAPIcons from '../SIGAPIcons.vue'

const props = defineProps<{
  modelValue: string | number
  options: { id: string | number; name: string }[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)

const toggle = () => {
  if (!props.disabled) isOpen.value = !isOpen.value
}

const select = (id: string | number) => {
  emit('update:modelValue', id)
  isOpen.value = false
}

const selectedLabel = computed(() => {
  const found = props.options.find(opt => opt.id == props.modelValue)
  return found ? found.name : (props.placeholder || 'Pilih...')
})

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="relative w-full" ref="selectRef">
    <!-- Trigger Button -->
    <div 
      @click="toggle"
      :class="[
        'w-full bg-slate-100/60 border-2 rounded-2xl p-4 text-[13px] font-bold flex items-center justify-between transition-all cursor-pointer',
        isOpen ? 'bg-white border-blue-400 shadow-xl shadow-blue-500/10 ring-8 ring-blue-500/5' : 'border-slate-100/10',
        disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-white hover:border-blue-200'
      ]"
    >
      <span :class="!modelValue ? 'text-slate-400' : 'text-slate-700'">{{ selectedLabel }}</span>
      <SIGAPIcons 
        name="ChevronDown" 
        :size="16" 
        class="text-slate-400 transition-transform duration-300"
        :class="{ 'rotate-180 text-blue-500': isOpen }"
      />
    </div>

    <!-- Dropdown List -->
    <Transition name="pop">
      <div 
        v-if="isOpen" 
        class="absolute z-[999] top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border-2 border-white rounded-[1.8rem] shadow-2xl shadow-blue-900/10 overflow-hidden py-3 origin-top"
      >
        <div class="max-h-[250px] overflow-y-auto scrollbar-soft">
          <div 
            v-for="opt in options" 
            :key="opt.id"
            @click="select(opt.id)"
            :class="[
              'px-6 py-3.5 text-[12px] font-bold transition-all cursor-pointer flex items-center justify-between group mx-2 rounded-2xl',
              modelValue == opt.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-white hover:text-blue-500 hover:shadow-md'
            ]"
          >
            <span>{{ opt.name }}</span>
            <SIGAPIcons 
              v-if="modelValue == opt.id" 
              name="Check" 
              :size="14" 
              class="text-white"
            />
          </div>
          
          <div v-if="options.length === 0" class="px-6 py-8 text-center">
            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Data tidak tersedia</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scrollbar-soft::-webkit-scrollbar { width: 4px; }
.scrollbar-soft::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.scrollbar-soft::-webkit-scrollbar-track { background: transparent; }

.pop-enter-active {
  animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-leave-active {
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse;
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.92) translateY(-20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>

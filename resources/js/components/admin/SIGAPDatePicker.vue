<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SIGAPIcons from '../SIGAPIcons.vue'

const props = defineProps<{
  modelValue: string // YYYY-MM-DD
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)

// Calendar state
const now = new Date()
const viewDate = ref(props.modelValue ? new Date(props.modelValue) : new Date())
const selectedDate = computed(() => props.modelValue ? new Date(props.modelValue) : null)

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const currentMonth = computed(() => viewDate.value.getMonth())
const currentYear = computed(() => viewDate.value.getFullYear())

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const days = []
  
  // Padding from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    })
  }
  
  // Padding for next month
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    })
  }
  
  return days
})

const togglePicker = () => {
  if (!props.disabled) isOpen.value = !isOpen.value
}

const changeMonth = (delta: number) => {
  const newDate = new Date(viewDate.value)
  newDate.setMonth(newDate.getMonth() + delta)
  viewDate.value = newDate
}

const selectDate = (dayObj: any) => {
  const date = new Date(dayObj.year, dayObj.month, dayObj.day)
  // Ensure we get local date string YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const isoDate = `${year}-${month}-${day}`
  
  emit('update:modelValue', isoDate)
  isOpen.value = false
}

const isSelected = (dayObj: any) => {
  if (!selectedDate.value) return false
  return selectedDate.value.getFullYear() === dayObj.year &&
         selectedDate.value.getMonth() === dayObj.month &&
         selectedDate.value.getDate() === dayObj.day
}

const isToday = (dayObj: any) => {
  return now.getFullYear() === dayObj.year &&
         now.getMonth() === dayObj.month &&
         now.getDate() === dayObj.day
}

const formattedDisplay = computed(() => {
  if (!props.modelValue) return props.placeholder || 'Pilih Tanggal'
  const parts = props.modelValue.split('-')
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
})

const handleClickOutside = (event: MouseEvent) => {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
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
  <div class="relative w-full" ref="pickerRef">
    <!-- Trigger -->
    <div 
      @click="togglePicker"
      :class="[
        'w-full bg-slate-100/60 border-2 rounded-2xl p-4 text-[13px] font-bold flex items-center justify-between transition-all cursor-pointer',
        isOpen ? 'bg-white border-blue-400 shadow-xl shadow-blue-500/10 ring-8 ring-blue-500/5' : 'border-slate-100/10',
        disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-white hover:border-blue-200'
      ]"
    >
      <div class="flex items-center gap-3">
        <SIGAPIcons name="Calendar" :size="16" :class="isOpen ? 'text-blue-500' : 'text-slate-400'" />
        <span class="truncate" :class="!modelValue ? 'text-slate-400' : 'text-slate-700'">{{ formattedDisplay }}</span>
      </div>
      <SIGAPIcons 
        v-if="modelValue && !disabled" 
        name="X" 
        :size="14" 
        @click.stop="emit('update:modelValue', '')"
        class="text-slate-300 hover:text-red-500 transition-colors"
      />
    </div>

    <!-- Calendar Dropdown -->
    <Transition name="pop">
      <div 
        v-if="isOpen" 
        class="absolute z-[999] top-full left-0 mt-3 w-[300px] bg-white/90 backdrop-blur-xl border-2 border-white rounded-[2rem] shadow-2xl shadow-blue-900/10 overflow-hidden p-5 origin-top"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-blue-50 rounded-xl transition-all text-slate-400 hover:text-blue-600">
            <SIGAPIcons name="ChevronLeft" :size="18" />
          </button>
          <div class="text-center">
            <h4 class="text-[13px] font-black text-slate-800 leading-none">{{ months[currentMonth] }}</h4>
            <p class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{{ currentYear }}</p>
          </div>
          <button @click="changeMonth(1)" class="p-2 hover:bg-blue-50 rounded-xl transition-all text-slate-400 hover:text-blue-600">
            <SIGAPIcons name="ChevronRight" :size="18" />
          </button>
        </div>

        <!-- Days Name -->
        <div class="grid grid-cols-7 mb-2">
          <div v-for="day in daysOfWeek" :key="day" class="text-center text-[10px] font-black text-slate-300 uppercase py-1">
            {{ day }}
          </div>
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1">
          <div 
            v-for="(d, i) in calendarDays" 
            :key="i"
            @click="selectDate(d)"
            :class="[
              'aspect-square flex items-center justify-center text-[11px] font-bold rounded-xl cursor-pointer transition-all',
              !d.isCurrentMonth ? 'text-slate-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:scale-110',
              isSelected(d) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 !scale-110' : '',
              isToday(d) && !isSelected(d) ? 'border-2 border-blue-100 text-blue-600' : ''
            ]"
          >
            {{ d.day }}
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-4 pt-4 border-t border-slate-50 flex justify-center">
           <button 
             @click="selectDate({day: now.getDate(), month: now.getMonth(), year: now.getFullYear()})" 
             class="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
           >
             Hari Ini
           </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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

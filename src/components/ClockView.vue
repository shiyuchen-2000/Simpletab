<script setup>
import { computed } from 'vue'
import { state, clockParts, fontStack } from '../store'

const parts = computed(() => clockParts())
const timeStyle = computed(() => {
  const style = {
    fontFamily: fontStack(state.clockFont),
    color: state.clockColor || 'var(--clock-text)'
  }
  /* 自定义时间颜色时，光晕跟随同色（40% 透明度），再叠一层深色投影保证可读 */
  if (state.clockColor) {
    style.textShadow = `0 0 44px ${state.clockColor}66, 0 2px 22px rgba(0,0,0,.35)`
  }
  return style
})
const dateStyle = computed(() => ({ color: state.dateColor || '' }))
</script>

<template>
  <div class="clock-time" :class="{ blink: state.blink }" :style="timeStyle">
    <span>{{ parts.h }}</span><span class="colon">:</span><span>{{ parts.m }}</span>
    <span class="clock-ampm">{{ state.hour12 ? parts.am : '' }}</span>
    <span v-if="state.showSeconds"><span class="colon">:</span><span>{{ parts.s }}</span></span>
  </div>
  <div v-if="state.showDate" class="clock-date" :style="dateStyle">{{ parts.date }}</div>
</template>

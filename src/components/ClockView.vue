<script setup>
import { computed } from 'vue'
import { state, clockParts, fontStack } from '../store'

const parts = computed(() => clockParts())
const timeStyle = computed(() => ({
  fontFamily: fontStack(state.clockFont),
  color: state.clockColor || 'var(--clock-text)'
}))
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

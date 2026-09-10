<script setup>
// 单字符图标：用 SVG <text> + dominant-baseline central 按字形中心精确居中，
// 避免不同系统字体基线偏移导致字母歪斜（替代文本 span 的 flex 居中）
defineProps({ letter: { type: String, default: '?' } })
</script>

<template>
  <svg class="fl" viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
    <text x="12" y="12.4" text-anchor="middle" dominant-baseline="central"
          fill="currentColor" font-size="11.5" font-weight="600">{{ letter }}</text>
  </svg>
</template>

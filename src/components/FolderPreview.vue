<script setup>
/* 封面流两侧的模糊文件夹预览：缩小磁贴网格 + 文件夹名，纯展示
   （pointer-events 由父级 cf-panel 关闭；磨砂模糊由 cf-panel 的 filter 提供，
   内部 .fp-* / .tile 复用全局样式保证与聚焦面板视觉一致） */
import { computed } from 'vue'
import { state, letterOf } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const props = defineProps({ folder: { type: Object, required: true } })
const links = computed(() => state.links.filter(l => l.folderId === props.folder.id))
</script>

<template>
  <div class="cf-preview">
    <div class="fp-head cf-ph">
      <span class="fp-ico">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
      </span>
      <span class="fp-title">{{ folder.title }}</span>
    </div>
    <div class="fp-grid cf-grid">
      <div v-for="l in links" :key="l.id" class="tile">
        <div class="t-ico" :data-ic="l.iconMode">
          <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
          <LetterIco :letter="letterOf(l.title)" />
        </div>
        <div class="t-name">{{ l.title }}</div>
      </div>
    </div>
  </div>
</template>

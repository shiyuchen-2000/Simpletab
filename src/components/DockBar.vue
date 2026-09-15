<script setup>
import { computed } from 'vue'
import { state, dockVisible, letterOf, openCtxAt, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const dockList = computed(() => state.links.filter(l => l.inDock).slice(0, state.dockCount || 7))
const visible = computed(() => dockVisible())
const dockClass = computed(() => ({ 'dock-visible': visible.value }))

function openLink(l) { openLinkUrl(l.url) }
function onItemCtx(e, l) {
  e.preventDefault(); e.stopPropagation()
  openCtxAt(e, [{ act: 'confirm-undock', label: '从拓展坞删除', icon: 'pin' }], l.id, false)
}
/* 拓展坞图标：加载失败移除 img（露出字母兜底），成功隐藏底层字母（透明底图标不叠加） */
function onImgError(e) {
  const fl = e.target.closest('.t-ico, .dock-item')?.querySelector('.fl')
  if (fl) fl.style.display = ''
  e.target.remove()
}
function onImgLoad(e) {
  const img = e.target
  if (img.naturalWidth > 1 && img.naturalHeight > 1) {
    const fl = img.closest('.t-ico, .dock-item')?.querySelector('.fl')
    if (fl) fl.style.display = 'none'
  } else {
    img.remove()   // 1xN 之类坏图 cover 拉伸会显示成横/竖条，丢弃露出字母
  }
}
</script>

<template>
  <div class="dock" :class="dockClass">
    <div v-for="l in dockList" :key="l.id" class="dock-item" :title="l.title"
         @click="openLink(l)" @contextmenu="onItemCtx($event, l)">
      <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
           @error="onImgError" @load="onImgLoad">
      <LetterIco :letter="letterOf(l.title)" />
    </div>
  </div>
</template>

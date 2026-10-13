<script setup>
import { computed, ref } from 'vue'
import { state, dockVisible, letterOf, openCtxAt, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const dockList = computed(() => state.links.filter(l => l.inDock).slice(0, state.dockCount || 7))
const visible = computed(() => dockVisible())
const dockClass = computed(() => ({ 'dock-visible': visible.value }))

/* 联动浮起：按图标与鼠标的水平距离衰减，近者浮起多、远者少（macOS 式邻居跟随）。
   总幅度由设置 state.dockHoverLift 控制（0 关闭）：容器承担 40%（CSS .dock:hover），
   图标相对容器承担 60% —— 这样图标相对容器的浮起始终 ≤ 0.6×设置，不超过容器 padding 而不被裁切 */
const dockRef = ref(null)
const RANGE = 100     // 影响半径 px
function onDockMove(e) {
  const items = dockRef.value?.children
  if (!items) return
  const lift = state.dockHoverLift ?? 6
  for (const el of items) {
    const r = el.getBoundingClientRect()
    const d = Math.abs(e.clientX - (r.left + r.width / 2))
    const k = Math.max(0, 1 - d / RANGE)
    el.style.setProperty('--dock-lift', (-lift * 0.6 * k).toFixed(2) + 'px')
    el.style.setProperty('--dock-scale', (1 + (lift / 100) * k).toFixed(3))
  }
}
function onDockLeave() {
  const items = dockRef.value?.children
  if (!items) return
  for (const el of items) {
    el.style.removeProperty('--dock-lift')
    el.style.removeProperty('--dock-scale')
  }
}

/* 悬停名称：挂到 body 层显示——拓展坞 overflow-x:auto 会裁切内部浮层，故用 Teleport 脱离 */
const tip = ref(null)   // { text, x, y }
function onItemEnter(e, l) {
  if (!state.dockName) { tip.value = null; return }
  const r = e.currentTarget.getBoundingClientRect()
  tip.value = { text: l.title, x: Math.round(r.left + r.width / 2), y: Math.round(r.top) }
}
function onItemLeave() { tip.value = null }

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
  <div class="dock" ref="dockRef" :class="dockClass" @mousemove="onDockMove" @mouseleave="onDockLeave">
    <div v-for="l in dockList" :key="l.id" class="dock-item" :data-ic="l.iconMode"
         @click="openLink(l)" @contextmenu="onItemCtx($event, l)"
         @mouseenter="onItemEnter($event, l)" @mouseleave="onItemLeave">
      <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
           @error="onImgError" @load="onImgLoad">
      <LetterIco :letter="letterOf(l.title)" />
    </div>
  </div>

  <!-- 悬停名称：挂 body 层，避免被拓展坞 overflow 裁切 -->
  <Teleport to="body">
    <Transition name="dockTip">
      <div class="dock-tip" v-if="tip && state.dockName" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">{{ tip.text }}</div>
    </Transition>
  </Teleport>
</template>

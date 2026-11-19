<script setup>
import { computed, ref } from 'vue'
import { state, dockVisible, letterOf, openCtxAt, openLinkUrl, save, dockListOrdered, moveDockLink, EMPTY_DRAG_IMAGE } from '../store'
import { faviconSrc, isDarkIcon } from '../store/faviconCache'
import { onImgError, onImgLoad } from './iconFallback'
import LetterIco from './LetterIco.vue'

const dockList = computed(() => dockListOrdered().slice(0, state.dockCount || 7))
const visible = computed(() => dockVisible())
const dockClass = computed(() => ({ 'dock-visible': visible.value }))

/* 联动浮起：按图标与鼠标的水平距离衰减，近者浮起多、远者少（macOS 式邻居跟随）。
   只有图标动，背景保持静止：图标最大浮起 0.6×设置，不超过容器 padding，不会被 overflow 裁切 */
const dockRef = ref(null)
const RANGE = 100     // 影响半径 px
function onDockMove(e) {
  if (dockDragId.value) return   // 拖拽排序中禁用浮起动画
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
  if (dockDragId.value) { tip.value = null; return }   // 拖拽排序中不显示名称
  if (!state.dockName) { tip.value = null; return }
  const r = e.currentTarget.getBoundingClientRect()
  tip.value = { text: l.title, x: Math.round(r.left + r.width / 2), y: Math.round(r.top) }
}
function onItemLeave() { tip.value = null }

function openLink(l) {
  if (Date.now() - dragEndedAt < 250) return   // 拖拽结束后的误触 click
  openLinkUrl(l.url)
}

/* ---------- 拖拽排序：只改 state.dockOrder，链接页顺序不受影响 ---------- */
const dockDragId = ref(null)
const emptyDragImage = new Image()
emptyDragImage.src = EMPTY_DRAG_IMAGE
let dockOrderBefore = []
let dockMoved = false
let dockDropped = false
let dockLastMove = 0
let dragEndedAt = 0

function onDockDragStart(e, l) {
  e.dataTransfer.setData('text/dock', l.id)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setDragImage(emptyDragImage, 0, 0)
  dockDragId.value = l.id
  dockOrderBefore = [...(state.dockOrder || [])]
  dockMoved = false
  dockDropped = false
  dockLastMove = 0
  tip.value = null
  onDockLeave()   // 清掉拖拽前残留的浮起位移
  e.currentTarget.classList.add('dragging')
}
function onDockDragOver(e, l) {
  if (!e.dataTransfer.types.includes('text/dock') || !dockDragId.value || dockDragId.value === l.id) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const now = Date.now()
  if (now - dockLastMove < 50) return   // 触控板连续 dragover 节流
  dockLastMove = now
  const r = e.currentTarget.getBoundingClientRect()
  if (moveDockLink(dockDragId.value, l.id, e.clientX > r.left + r.width / 2)) dockMoved = true
}
/* 拖到图标间隙（容器）也允许落位 */
function onDockAreaDragOver(e) {
  if (dockDragId.value) e.preventDefault()
}
function onDockDrop(e) {
  if (!dockDragId.value) return
  e.preventDefault()
  dockDropped = true
}
function onDockDragEnd(e) {
  e.currentTarget?.classList.remove('dragging')
  if (!dockDropped && dockMoved) state.dockOrder = dockOrderBefore   // Esc / 拖出：恢复原顺序
  dockDragId.value = null
  dockMoved = false
  dragEndedAt = Date.now()
  if (dockDropped) { dockDropped = false; save() }
}
function onItemCtx(e, l) {
  e.preventDefault(); e.stopPropagation()
  openCtxAt(e, [{ act: 'confirm-undock', label: '从拓展坞删除', icon: 'pin' }], l.id, false)
}
</script>

<template>
  <div class="dock" ref="dockRef" :class="dockClass" @mousemove="onDockMove" @mouseleave="onDockLeave"
       @dragover="onDockAreaDragOver" @drop="onDockDrop">
    <div v-for="l in dockList" :key="l.id" class="dock-item" :data-id="l.id" :data-ic="l.iconMode" draggable="true"
         :class="{ dragging: dockDragId === l.id }"
         @click="openLink(l)" @contextmenu="onItemCtx($event, l)"
         @dragstart="onDockDragStart($event, l)" @dragover="onDockDragOver($event, l)" @dragend="onDockDragEnd"
         @mouseenter="onItemEnter($event, l)" @mouseleave="onItemLeave">
      <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" :class="{ 'dark-icon': isDarkIcon(l.url) }" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
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

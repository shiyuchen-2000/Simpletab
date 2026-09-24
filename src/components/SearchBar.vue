<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { state, ui, setEngine, cycleEngine, doSearch, resolveLayout } from '../store'

const engineOpen = ref(false)
const engineClosing = ref(false)
let closeTimer = null
const engineName = computed(() => (state.engines.find(x => x.key === state.engine) || {}).name)
const pillClass = computed(() => ({ flip: ui.flip, open: engineOpen.value }))
/* 搜索框 hover/聚焦展开会与时钟或拓展坞重叠时，加 no-expand 让位（不展开），避免遮挡 */
const noExpand = ref(false)
/* 展开方向：位置偏左向右展开、偏右向左展开、居中双向（由 --search-x 决定） */
const expandDir = ref('c')
function updateExpandDir() {
  const { search } = resolveLayout()
  expandDir.value = search.x < 45 ? 'r' : search.x > 55 ? 'l' : 'c'
}
watch([() => state.searchPos, () => state.layoutCustom], updateExpandDir)
const barClass = computed(() => ({ 'has-text': !!ui.searchQuery, 'no-expand': noExpand.value }))
function expandOverlaps() {
  const bar = document.querySelector('#searchBar')
  if (!bar) return false
  const root = getComputedStyle(document.documentElement)
  const x = parseFloat(root.getPropertyValue('--search-x')) || 50
  const y = parseFloat(root.getPropertyValue('--search-y')) || 40
  const w = parseFloat(root.getPropertyValue('--search-w')) || 400
  const wExp = Math.min(w + 220, innerWidth * 0.92)
  const hh = bar.getBoundingClientRect().height / 2
  const cx = x / 100 * innerWidth, cy = y / 100 * innerHeight
  const r = { l: cx - wExp / 2, r: cx + wExp / 2, t: cy - hh, b: cy + hh }
  const hit = el => {
    if (!el) return false
    const b = el.getBoundingClientRect()
    if (!b.width || !b.height) return false
    return r.l < b.right && r.r > b.left && r.t < b.bottom && r.b > b.top
  }
  return hit(document.querySelector('#clockWrap')) || hit(document.querySelector('.dock'))
}
function onBarEnter() { if (expandOverlaps()) noExpand.value = true }
function onBarLeave(e) {
  /* 移到搜索框内部子元素（图标/输入框/引擎按钮）时不算离开，不恢复展开，
     避免有遮挡时在框内移动误触发展开 */
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
  /* 仍有遮挡则保持 no-expand：聚焦后鼠标移开也不展开 */
  noExpand.value = expandOverlaps()
}

function onKeydown(e) {
  if (e.key === 'Tab') { e.preventDefault(); closeEngine(); cycleEngine() }
  if (e.key === 'Enter') doSearch()
}
/* 引擎下拉：打开/关闭带退出动画 */
function openEngine() {
  clearTimeout(closeTimer)
  engineClosing.value = false
  engineOpen.value = true
}
function closeEngine() {
  if (!engineOpen.value) return
  engineOpen.value = false
  engineClosing.value = true
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => { engineClosing.value = false }, 200)
}
function onPillClick() { engineOpen.value ? closeEngine() : openEngine() }
function selectEngine(key) { closeEngine(); setEngine(key) }
/* 点外部 / ESC：Esc 先清空输入，再收起引擎下拉 */
function onDocClick(e) {
  if (engineOpen.value && !e.target.closest('.engine-wrap')) closeEngine()
}
function onDocKeydown(e) {
  if (e.key !== 'Escape') return
  if (ui.searchQuery) { ui.searchQuery = ''; return }
  if (engineOpen.value) closeEngine()
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKeydown)
  updateExpandDir()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKeydown)
  clearTimeout(closeTimer)
})
</script>

<template>
  <div class="search-bar" id="searchBar" :class="barClass" :data-expand="expandDir" @mouseenter="onBarEnter" @mouseleave="onBarLeave">
    <span class="s-ico" :class="{ 'has-text': !!ui.searchQuery }" @click="ui.searchQuery = ''" title="清空搜索">
      <svg class="si-a" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <svg class="si-b" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </span>
    <input type="text" placeholder="搜索一下…" v-model="ui.searchQuery"
           autocomplete="off" spellcheck="false" @keydown="onKeydown">
    <div class="engine-wrap">
      <button class="engine-pill" :class="pillClass" @click.stop="onPillClick" title="点击选择搜索引擎 · Tab 键循环">
        <span>{{ engineName }}</span>
        <span class="ep-caret" :class="{ open: engineOpen }">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>
      <div class="engine-dropdown" :class="{ closing: engineClosing }" v-if="engineOpen || engineClosing">
        <button v-for="e in state.engines" :key="e.key" class="ed-item" :class="{ on: e.key === state.engine }" @click.stop="selectEngine(e.key)">
          <span class="ed-name">{{ e.name }}</span>
          <span class="ed-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
        </button>
      </div>
    </div>
  </div>
</template>

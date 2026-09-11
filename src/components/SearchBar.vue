<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { state, ui, setEngine, cycleEngine, doSearch } from '../store'

const engineOpen = ref(false)
const engineClosing = ref(false)
let closeTimer = null
const engineName = computed(() => (state.engines.find(x => x.key === state.engine) || {}).name)
const pillClass = computed(() => ({ flip: ui.flip, open: engineOpen.value }))
const barClass = computed(() => ({ 'has-text': !!ui.searchQuery }))

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
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKeydown)
  clearTimeout(closeTimer)
})
</script>

<template>
  <div class="search-bar" id="searchBar" :class="barClass">
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

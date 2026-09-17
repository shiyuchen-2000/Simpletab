<script setup>
import { ui, state, save, toast, startTour } from '../store'

function onGearDragstart(e) {
  ui.gearDragging = true
  e.dataTransfer.setData('text/newfolder', '1')
  e.dataTransfer.effectAllowed = 'copy'
}
function onGearDragend() {
  setTimeout(() => { ui.gearDragging = false }, 0)
}
function onGearClick() {
  if (ui.gearDragging) return
  ui.dropdownOpen = !ui.dropdownOpen
}
function onGearDragover(e) {
  if (e.dataTransfer.types.includes('text/folder')) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('dragover')
  }
}
function onGearDragleave(e) { e.currentTarget.classList.remove('dragover') }
function onGearDrop(e) {
  e.preventDefault()
  const fid = e.dataTransfer.getData('text/folder')
  if (fid) {
    const f = state.folders.find(x => x.id === fid)
    if (f) {
      state.links.forEach(l => { if (l.folderId === fid) l.folderId = null })
      state.folders = state.folders.filter(x => x.id !== fid)
      save(); toast('已还原为设置图标')
    }
  }
  e.currentTarget.classList.remove('dragover')
}
function openPanel(name) {
  ui.dropdownOpen = false
  ui.modal = name
}
/* 安装扩展：打开宣传页/下载页（新标签页） */
function openInstall() {
  window.open('https://simpletabgo.pages.dev/', '_blank')
}
</script>

<template>
  <!-- 顶部齿轮（仅快捷链接页显示） -->
  <div id="gearZone">
    <button id="gearBtn" draggable="true"
            :class="{ 'dropdown-open': ui.dropdownOpen }"
            title="拖入快捷链接区可创建文件夹 · 文件夹拖回此处还原"
            aria-label="设置"
            @click="onGearClick" @dragstart="onGearDragstart" @dragend="onGearDragend"
            @dragover="onGearDragover" @dragleave="onGearDragleave" @drop="onGearDrop">
      <svg class="gear-svg gs-a" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <svg class="gear-svg gs-b" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
  </div>

  <!-- 设置下拉 -->
  <div class="dropdown" :class="{ show: ui.dropdownOpen }">
    <button class="d-item" @click="openPanel('settings')">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
      常规设置
    </button>
    <button class="d-item" @click="openPanel('wallpaper')">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
      </span>
      壁纸偏好
    </button>
    <button class="d-item" @click="openPanel('engine')">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
      </span>
      搜索引擎偏好
    </button>
    <button class="d-item" @click="openPanel('data')">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10"/><path d="m10 10-3-3 3-3"/><path d="M17 17H7"/><path d="m14 14 3 3-3 3"/></svg>
      </span>
      数据管理
    </button>
    <div class="d-sep"></div>
    <button class="d-item" @click="startTour">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
      </span>
      新手指引
    </button>
    <button class="d-item" @click="openInstall">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
      </span>
      安装扩展
    </button>
    <button class="d-item" @click="openPanel('about')">
      <span class="di">
        <svg class="di-a" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v5"/></svg>
        <svg class="di-b" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </span>
      关于
    </button>
  </div>
</template>

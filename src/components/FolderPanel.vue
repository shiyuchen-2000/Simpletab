<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { state, ui, save, uid, toast, letterOf, openAddForm, deleteFolder, renameFolder, closeFolder, pruneEmptyFolders, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

// 展示中的文件夹：打开时更新；关闭后保留引用直到退出动画结束，避免 v-if 立即卸载导致无动画
const displayFolder = ref(null)
const folder = computed(() => displayFolder.value)
const links = computed(() => displayFolder.value ? state.links.filter(l => l.folderId === displayFolder.value.id) : [])
const editing = ref(false)
const editTitle = ref('')
const gridRef = ref(null)
const panelRef = ref(null)
// 缩放锚点：指向触发打开的文件夹磁贴中心，让面板"从磁贴展开、落回磁贴"而非屏幕中心
const panelOrigin = ref('50% 50%')

watch(() => ui.folderOpenId, async (id) => {
  editing.value = false
  if (!id) return
  displayFolder.value = state.folders.find(f => f.id === id) || null
  const tile = document.querySelector(`.folder-tile[data-fid="${id}"]`)
  if (!tile) { panelOrigin.value = '50% 50%'; return }
  const r = tile.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  await nextTick()   // 等面板渲染并 flex 居中后再测量，换算相对面板左上角的偏移
  const pr = panelRef.value ? panelRef.value.getBoundingClientRect() : null
  panelOrigin.value = pr ? `${cx - pr.left}px ${cy - pr.top}px` : '50% 50%'
})
// 标题在打开期间被改名时同步
watch(() => displayFolder.value && state.folders.find(f => f.id === displayFolder.value.id)?.title, (title) => {
  if (displayFolder.value && title != null) displayFolder.value = { ...displayFolder.value, title }
})
// 关闭动画结束后再卸载面板内容
function onAnimationEnd(e) {
  if (e.target !== e.currentTarget) return
  if (ui.folderClosing && !ui.folderOpenId) displayFolder.value = null
}

function startEdit() { editing.value = true; editTitle.value = folder.value?.title || '' }
function commitEdit() {
  if (ui.folderOpenId && editTitle.value.trim()) renameFolder(ui.folderOpenId, editTitle.value)
  editing.value = false
}

/* ---------- 文件夹内拖拽排序 ---------- */
let dropLine = null
function ensureDropLine() {
  if (!dropLine) {
    dropLine = document.createElement('div')
    dropLine.style.cssText = 'width:2px;background:var(--accent);border-radius:2px;align-self:stretch;'
  }
  return dropLine
}
function computeInsertIndex(container, clientX, clientY) {
  const all = [...container.querySelectorAll('.tile:not(.add)')]
  if (!all.length) return { tiles: all, index: 0 }
  const rows = []
  for (const t of all) {
    const r = t.getBoundingClientRect()
    let row = rows.find(rw => Math.abs(rw.top - r.top) < 4)
    if (!row) { row = { top: r.top, bottom: r.bottom, items: [] }; rows.push(row) }
    row.items.push({ el: t, rect: r })
    row.bottom = Math.max(row.bottom, r.bottom)
  }
  rows.sort((a, b) => a.top - b.top)
  let row = rows.find(rw => clientY >= rw.top && clientY <= rw.bottom)
  if (!row) row = clientY < rows[0].top ? rows[0] : rows[rows.length - 1]
  row.items.sort((a, b) => a.rect.left - b.rect.left)
  let index = all.indexOf(row.items[0].el)
  for (const it of row.items) {
    const mid = it.rect.left + it.rect.width / 2
    if (clientX >= mid) index = all.indexOf(it.el) + 1
    else break
  }
  return { tiles: all, index }
}
function clearDropLine() {
  if (dropLine && dropLine.parentNode) dropLine.remove()
  dropLine = null
}
function showDropLine(e) {
  const line = ensureDropLine()
  if (line.parentNode) line.remove()
  const grid = gridRef.value
  if (!grid) return
  const { tiles, index } = computeInsertIndex(grid, e.clientX, e.clientY)
  line.dataset.idx = index
  const addTile = grid.querySelector('.tile.add')
  if (index >= tiles.length) grid.insertBefore(line, addTile)
  else grid.insertBefore(line, tiles[index])
}

function onGridDrop(e) {
  e.preventDefault()
  const lid = e.dataTransfer.getData('text/link')
  if (!lid || !ui.folderOpenId) { clearDropLine(); return }
  const l = state.links.find(x => x.id === lid)
  if (!l) { clearDropLine(); return }
  const oldFid = l.folderId
  l.folderId = ui.folderOpenId
  if (oldFid && oldFid !== ui.folderOpenId) pruneEmptyFolders()
  let arr = state.links.filter(x => x.folderId === ui.folderOpenId)
  const oi = arr.findIndex(x => x.id === lid)
  if (oi > -1) arr.splice(oi, 1)
  const idx = dropLine ? parseInt(dropLine.dataset.idx, 10) : arr.length
  arr.splice(Math.max(0, Math.min(idx, arr.length)), 0, l)
  const ids = arr.map(x => x.id)
  state.links = [
    ...state.links.filter(x => x.folderId !== ui.folderOpenId),
    ...ids.map(id => state.links.find(x => x.id === id)).filter(Boolean)
  ]
  save()
  clearDropLine()
}
function onGridDragover(e) {
  if (e.dataTransfer.types.includes('text/link')) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    showDropLine(e)
  }
}
onBeforeUnmount(clearDropLine)

function openLink(l) { openLinkUrl(l.url) }
/* 磁贴图标：加载失败移除 img（露出字母兜底），成功隐藏底层字母（透明底图标不叠加） */
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
/* 文字图标显示：text 模式强制显示，清除 auto 模式加载图标后残留的内联 display:none */
function letterStyle(l) {
  return l.iconMode === 'text' ? { display: '' } : {}
}
</script>

<template>
  <div class="folder-backdrop" :class="{ show: !!ui.folderOpenId, closing: ui.folderClosing }"
       @click.self="closeFolder" @animationend="onAnimationEnd">
    <div class="folder-panel" v-if="folder" ref="panelRef" :style="{ transformOrigin: panelOrigin }">
      <div class="fp-head">
        <span class="fp-ico">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
        </span>
        <input v-if="editing" class="fp-title-input" v-model="editTitle"
               @blur="commitEdit" @keydown.enter="commitEdit" @keydown.esc="editing = false">
        <span v-else class="fp-title" @dblclick="startEdit">{{ folder.title }}</span>
        <span class="fp-count">{{ links.length }} 个链接</span>
        <button class="fp-rm" title="删除文件夹（链接将移出）" @click="deleteFolder(folder.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>

      <div class="fp-grid" ref="gridRef" @dragover="onGridDragover" @drop="onGridDrop">
        <div v-for="l in links" :key="l.id"
             class="tile" :data-id="l.id" draggable="true"
             @click="openLink(l)"
             @dragstart="e => { e.dataTransfer.setData('text/link', l.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('dragging') }"
             @dragend="e => e.currentTarget.classList.remove('dragging')">
          <div class="t-ico">
            <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                 @error="onImgError" @load="onImgLoad">
            <LetterIco :letter="letterOf(l.title)" :style="letterStyle(l)" />
          </div>
          <div class="t-name">{{ l.title }}</div>
        </div>

        <div class="tile add" @click.stop="openAddForm($event.currentTarget, folder.id)">
          <div class="plus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

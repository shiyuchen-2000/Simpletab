<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { state, uid, save, toast, letterOf, openFolder, openAddForm, pruneEmptyFolders, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const areaRef = ref(null)
const draggingId = ref(null)
const dragInFid = ref(null)

const rootLinks = computed(() => state.links.filter(l => l && typeof l === 'object' && !l.folderId))
const folderLinks = fid => state.links.filter(l => l && typeof l === 'object' && l.folderId === fid)

function openLink(l) { openLinkUrl(l.url) }

/* 磁贴图标：加载失败移除 img（露出字母兜底），成功隐藏底层字母（透明底图标不叠加） */
function onTileImgError(e) {
  const fl = e.target.closest('.t-ico, .dock-item')?.querySelector('.fl')
  if (fl) fl.style.display = ''
  e.target.remove()
}
function onTileImgLoad(e) {
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
function folderMinis(fid) {
  return folderLinks(fid).slice(0, 4)
}
/* 文件夹磁贴缩略：本地缓存命中用背景图，未命中留字母（无破图风险） */
function miniStyle(l) {
  const f = l.iconMode !== 'text' ? faviconSrc(l.url) : ''
  return f ? { backgroundImage: `url("${f}")` } : {}
}

/* ---------- 拖拽 ---------- */
function onLinkDragstart(e, id) {
  e.dataTransfer.setData('text/link', id)
  e.dataTransfer.effectAllowed = 'move'
  draggingId.value = id
}
function onFolderDragstart(e, fid) {
  e.dataTransfer.setData('text/folder', fid)
  e.dataTransfer.effectAllowed = 'move'
  draggingId.value = 'f:' + fid
}
function onDragend() {
  draggingId.value = null
  dragInFid.value = null
  clearDropFx()
}
function onFolderDragover(e, fid) {
  if (e.dataTransfer.types.includes('text/link')) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    dragInFid.value = fid
  }
}
function onFolderDragleave() { dragInFid.value = null }
function onFolderDrop(e, fid) {
  e.preventDefault()
  dragInFid.value = null
  const lid = e.dataTransfer.getData('text/link')
  if (lid) {
    const l = state.links.find(x => x.id === lid)
    const f = state.folders.find(x => x.id === fid)
    if (l && f) { l.folderId = fid; save(); toast('已移入「' + f.title + '」') }
    return
  }
  // 文件夹拖到另一文件夹磁贴上：把被拖文件夹插入到目标文件夹之前
  const fdid = e.dataTransfer.getData('text/folder')
  if (fdid && fdid !== fid) {
    const f = state.folders.find(x => x.id === fdid)
    const targetIdx = state.folders.findIndex(x => x.id === fid)
    if (f && targetIdx > -1) {
      const oi = state.folders.findIndex(x => x.id === fdid)
      const others = state.folders.filter(x => x.id !== fdid)
      let t = Math.max(0, Math.min(targetIdx, others.length))
      if (oi < targetIdx) t -= 1
      others.splice(Math.max(0, t), 0, f)
      state.folders = others
      save()
    }
  }
}
/* ---------- 区域放置：链接排序 / 文件夹排序 / 齿轮建文件夹 ---------- */
let dropLine = null
function ensureDropLine() {
  if (!dropLine) {
    dropLine = document.createElement('div')
    dropLine.style.cssText = 'width:2px;background:var(--accent);border-radius:2px;align-self:stretch;'
  }
  return dropLine
}
// 在 flex-wrap 磁贴中，按"先定位行、再定位列"计算插入索引，避免跨行误判
function computeInsertIndex(container, clientX, clientY) {
  const all = [...container.querySelectorAll('.tile:not(.add)')]
  if (!all.length) return { tiles: all, index: 0 }
  // 按视觉顶部分行（容差 4px）
  const rows = []
  for (const t of all) {
    const r = t.getBoundingClientRect()
    let row = rows.find(rw => Math.abs(rw.top - r.top) < 4)
    if (!row) { row = { top: r.top, bottom: r.bottom, items: [] }; rows.push(row) }
    row.items.push({ el: t, rect: r })
    row.bottom = Math.max(row.bottom, r.bottom)
  }
  rows.sort((a, b) => a.top - b.top)
  // 找到鼠标所在行
  let row = rows.find(rw => clientY >= rw.top && clientY <= rw.bottom)
  if (!row) {
    // 在两行之间或区域外：靠近哪行归哪行；在所有行之上取首行，之下取末行
    row = clientY < rows[0].top ? rows[0] : rows[rows.length - 1]
  }
  row.items.sort((a, b) => a.rect.left - b.rect.left)
  // 行内：按磁贴中点判断落在它之前还是之后
  let index = all.indexOf(row.items[0].el)
  for (const it of row.items) {
    const mid = it.rect.left + it.rect.width / 2
    if (clientX >= mid) index = all.indexOf(it.el) + 1
    else break
  }
  return { tiles: all, index }
}
function showDropLine(e) {
  const line = ensureDropLine()
  if (line.parentNode) line.remove()
  const area = areaRef.value
  const { tiles, index: raw } = computeInsertIndex(area, e.clientX, e.clientY)
  // 文件夹磁贴恒排在最前：文件夹拖拽的落点限制在文件夹区内
  const index = draggingId.value?.startsWith('f:') ? Math.min(raw, state.folders.length) : raw
  line.dataset.idx = index
  const addTile = area.querySelector('.tile.add')
  if (index >= tiles.length) area.insertBefore(line, addTile)
  else area.insertBefore(line, tiles[index])
}
function clearDropFx() {
  if (dropLine && dropLine.parentNode) dropLine.remove()
  dropLine = null
  document.querySelectorAll('.drag-in').forEach(x => x.classList.remove('drag-in'))
}
// 组件卸载时清理拖拽过程中可能遗留的游离指示线节点
onBeforeUnmount(() => { if (dropLine && dropLine.parentNode) dropLine.remove(); dropLine = null })

function onAreaDragover(e) {
  const types = e.dataTransfer.types
  const lid = types.includes('text/link')
  const fid = types.includes('text/folder')
  const gear = types.includes('text/newfolder')
  if (lid || fid || gear) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    if (lid || fid) showDropLine(e)
  }
}
function onAreaDrop(e) {
  e.preventDefault()
  const lid = e.dataTransfer.getData('text/link')
  const fid = e.dataTransfer.getData('text/folder')
  const gear = e.dataTransfer.getData('text/newfolder')
  if (gear) {
    state.folders.push({ id: uid(), title: '新建文件夹' })
    save(); toast('已创建文件夹 · 点击打开，标题可编辑')
    clearDropFx(); return
  }
  if (fid) {
    const f = state.folders.find(x => x.id === fid)
    if (f) {
      // 文件夹磁贴恒排在最前：把视觉插入索引换算成文件夹数组索引
      const L = state.folders.length
      const oi = state.folders.findIndex(x => x.id === fid)
      let t = Math.max(0, Math.min(dropIndex(), L))
      if (t > oi) t -= 1
      const others = state.folders.filter(x => x.id !== fid)
      others.splice(t, 0, f)
      state.folders = others
      save()
    }
    clearDropFx(); return
  }
  if (lid) {
    const l = state.links.find(x => x.id === lid)
    if (!l) { clearDropFx(); return }
    const oldFid = l.folderId
    l.folderId = null
    if (oldFid) pruneEmptyFolders()
    // 视觉索引是按"文件夹 + 根链接"的 DOM 顺序，需换算成根链接数组中的真实位置
    const area = areaRef.value
    const visualTiles = area ? [...area.querySelectorAll('.tile:not(.add)')] : []
    let visualIdx = dropIndex()
    // 统计插入位置之前有多少个文件夹磁贴，并把被拖链接自身从计数中剔除
    let folderBefore = 0
    for (let i = 0; i < Math.min(visualIdx, visualTiles.length); i++) {
      if (visualTiles[i].classList.contains('folder-tile')) folderBefore++
    }
    // 被拖磁贴拖动时仍在 DOM 中：若它位于插入点之前，移除后序列整体左移一位，
    // 视觉索引需同步减 1，否则向右拖动会多移一位（文件夹分支已有同样的 t-=1 处理）
    const oiVisual = visualTiles.findIndex(t => t.dataset.id === lid)
    if (oiVisual !== -1 && oiVisual < visualIdx) visualIdx--
    let list = state.links.filter(x => !x.folderId)
    const oi = list.findIndex(x => x.id === lid)
    if (oi > -1) list.splice(oi, 1)
    const target = Math.max(0, Math.min(visualIdx - folderBefore, list.length))
    list.splice(target, 0, l)
    const rootIds = list.map(x => x.id)
    state.links = [
      ...state.links.filter(x => x.folderId),
      ...rootIds.map(id => state.links.find(x => x.id === id)).filter(Boolean)
    ]
    save()
  }
  clearDropFx()
}
function dropIndex() {
  if (!dropLine) return 0
  return parseInt(dropLine.dataset.idx, 10) || 0
}

</script>

<template>
  <div class="link-area" id="linkArea" ref="areaRef"
       @dragover="onAreaDragover" @drop="onAreaDrop">

    <!-- 文件夹磁贴 -->
    <div v-for="f in state.folders" :key="f.id"
         class="tile folder-tile" :data-fid="f.id" draggable="true"
         :class="{ 'drag-in': dragInFid === f.id, dragging: draggingId === 'f:' + f.id }"
         @click="openFolder(f.id)"
         @dragstart="onFolderDragstart($event, f.id)" @dragend="onDragend"
         @dragover="onFolderDragover($event, f.id)" @dragleave="onFolderDragleave"
         @drop.stop="onFolderDrop($event, f.id)">
      <div class="f-grid">
        <template v-if="folderMinis(f.id).length">
          <div v-for="(l, i) in folderMinis(f.id)" :key="i" class="mini" :style="miniStyle(l)">
            <LetterIco v-if="!miniStyle(l).backgroundImage" :letter="letterOf(l.title)" />
          </div>
        </template>
        <div v-else class="mini mini-add">+</div>
      </div>
      <div class="t-name">{{ f.title }}</div>
    </div>

    <!-- 根级链接磁贴 -->
    <div v-for="l in rootLinks" :key="l.id"
         class="tile" :data-id="l.id" draggable="true"
         :class="{ dragging: draggingId === l.id }"
         @click="openLink(l)"
         @dragstart="onLinkDragstart($event, l.id)" @dragend="onDragend">
      <div class="t-ico">
        <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
             @error="onTileImgError" @load="onTileImgLoad">
        <LetterIco :letter="letterOf(l.title)" :style="letterStyle(l)" />
      </div>
      <div class="t-name">{{ l.title }}</div>
    </div>

    <!-- 添加入口 -->
    <div class="tile add" @click.stop="openAddForm($event.currentTarget)">
      <div class="plus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </div>
    </div>
  </div>
</template>

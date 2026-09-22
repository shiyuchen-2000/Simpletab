<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { state, save, toast, letterOf, openFolder, openAddForm, pruneEmptyFolders, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const areaRef = ref(null)
const draggingId = ref(null)
const dragInFid = ref(null)
const dropTargetIdx = ref(-1)   // 拖拽目标插入位（B：拖动中记录，松手时按此换位落位）
/* 透明拖拽镜像：隐藏浏览器默认 drag image，避免与被拖图标实时移动造成"双层" */
const emptyDragImage = new Image()
emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

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

/* ---------- 拖拽（实时换位：拖动中其他图标让位，松手落位，拖出恢复原状） ---------- */
let originalOrder = []   // 拖拽前顺序快照（links 或 folders）
let dropped = false      // 本次拖拽是否已落位
let lastMoveTime = 0
let lastLinkTarget = -1
let lastFolderTarget = -1
function snapshotOrder() {
  originalOrder = draggingId.value?.startsWith('f:')
    ? state.folders.map(x => x.id)
    : state.links.map(x => x.id)
}
function onLinkDragstart(e, id) {
  e.dataTransfer.setData('text/link', id)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setDragImage(emptyDragImage, 0, 0)
  e.currentTarget.classList.add('dragging')
  draggingId.value = id
  dropped = false; lastLinkTarget = -1; lastFolderTarget = -1; lastMoveTime = 0
  snapshotOrder()
}
function onFolderDragstart(e, fid) {
  e.dataTransfer.setData('text/folder', fid)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setDragImage(emptyDragImage, 0, 0)
  e.currentTarget.classList.add('dragging')
  draggingId.value = 'f:' + fid
  dropped = false; lastLinkTarget = -1; lastFolderTarget = -1; lastMoveTime = 0
  snapshotOrder()
}
function restoreOrder() {
  if (draggingId.value?.startsWith('f:')) {
    state.folders = originalOrder.map(id => state.folders.find(x => x.id === id)).filter(Boolean)
  } else {
    state.links = originalOrder.map(id => state.links.find(x => x.id === id)).filter(Boolean)
  }
}
function onDragend(e) {
  if (!dropped) restoreOrder()   // 拖出区域 / 取消：图标恢复原状
  if (e.currentTarget) e.currentTarget.classList.remove('dragging')
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
  dropped = true
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
/* ---------- 区域放置：拖拽换位（B：拖动中记录目标位，松手一次性落位 + 动画） ---------- */
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
function clearDropFx() {
  dropTargetIdx.value = -1
  document.querySelectorAll('.drag-in').forEach(x => x.classList.remove('drag-in'))
}
// 组件卸载时清理拖拽状态
onBeforeUnmount(clearDropFx)

function onAreaDragover(e) {
  const types = e.dataTransfer.types
  const lid = types.includes('text/link')
  const fid = types.includes('text/folder')
  if (lid || fid) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    if (lid) moveDraggingLink(e.clientX, e.clientY)
    else if (fid) moveDraggingFolder(e.clientX, e.clientY)
  }
}
/* 实时换位：拖动中把被拖链接移到鼠标目标位，其余图标即时让位（TransitionGroup 平滑动画） */
function moveDraggingLink(clientX, clientY) {
  const now = Date.now()
  if (now - lastMoveTime < 50) return
  lastMoveTime = now
  const area = areaRef.value?.$el
  const id = draggingId.value
  if (!area || !id) return
  const { index: raw } = computeInsertIndex(area, clientX, clientY)
  if (raw === lastLinkTarget) return
  lastLinkTarget = raw
  const l = state.links.find(x => x.id === id)
  if (!l) return
  const visualTiles = [...area.querySelectorAll('.tile:not(.add)')]
  const cur = visualTiles.findIndex(t => t.dataset.id === id)
  let vi = raw
  if (cur !== -1 && cur < vi) vi--
  let folderBefore = 0
  for (let i = 0; i < Math.min(vi, visualTiles.length); i++) {
    if (visualTiles[i].classList.contains('folder-tile')) folderBefore++
  }
  let list = state.links.filter(x => !x.folderId)
  const oi = list.findIndex(x => x.id === id)
  if (oi > -1) list.splice(oi, 1)
  const t = Math.max(0, Math.min(vi - folderBefore, list.length))
  list.splice(t, 0, l)
  state.links = [
    ...state.links.filter(x => x.folderId),
    ...list.map(x => x.id).map(id => state.links.find(x => x.id === id)).filter(Boolean)
  ]
}
/* 实时换位：文件夹（恒排最前） */
function moveDraggingFolder(clientX, clientY) {
  const now = Date.now()
  if (now - lastMoveTime < 50) return
  lastMoveTime = now
  const area = areaRef.value?.$el
  const fid = draggingId.value?.slice(2)
  if (!area || !fid) return
  const { index: raw } = computeInsertIndex(area, clientX, clientY)
  const target = Math.min(raw, state.folders.length)
  if (target === lastFolderTarget) return
  lastFolderTarget = target
  const f = state.folders.find(x => x.id === fid)
  if (!f) return
  const oi = state.folders.findIndex(x => x.id === fid)
  let t = target
  if (t > oi) t -= 1
  const others = state.folders.filter(x => x.id !== fid)
  others.splice(Math.max(0, Math.min(t, others.length)), 0, f)
  state.folders = others
}
function onAreaDrop(e) {
  e.preventDefault()
  dropped = true
  const lid = e.dataTransfer.getData('text/link')
  const fid = e.dataTransfer.getData('text/folder')
  if (lid) {
    const l = state.links.find(x => x.id === lid)
    if (!l) { clearDropFx(); return }
    // 顺序已在拖动中实时排好；若从文件夹拖出则移出文件夹
    if (l.folderId) { l.folderId = null; pruneEmptyFolders() }
    save()
  } else if (fid) {
    save()   // 文件夹顺序已实时排好
  }
  clearDropFx()
}

</script>

<template>
  <TransitionGroup tag="div" name="tile" class="link-area" id="linkArea" ref="areaRef"
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
      <div class="t-ico" :data-ic="l.iconMode">
        <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
             @error="onTileImgError" @load="onTileImgLoad">
        <LetterIco :letter="letterOf(l.title)" :style="letterStyle(l)" />
      </div>
      <div class="t-name">{{ l.title }}</div>
    </div>

    <!-- 添加入口 -->
    <div class="tile add" key="add" @click.stop="openAddForm($event.currentTarget)">
      <div class="plus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </div>
    </div>
  </TransitionGroup>
</template>

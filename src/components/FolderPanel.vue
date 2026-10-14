<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { state, ui, save, uid, toast, letterOf, openAddForm, deleteFolder, renameFolder, closeFolder, pruneEmptyFolders, openLinkUrl } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'
import FolderPreview from './FolderPreview.vue'

// 展示中的文件夹：打开时更新；关闭后保留引用直到退出动画结束，避免 v-if 立即卸载导致无动画
const displayFolder = ref(null)   // 仅用于关闭动画期间保留旧文件夹
/* 打开时同步取当前文件夹（避免异步 watch 更新造成先渲染旧文件夹一帧）；
   关闭后回退到 displayFolder（保留关闭动画内容） */
const folder = computed(() => {
  if (ui.folderOpenId) return state.folders.find(f => f.id === ui.folderOpenId) || null
  return displayFolder.value
})
const links = computed(() => folder.value ? state.links.filter(l => l.folderId === folder.value.id) : [])
const editing = ref(false)
const editTitle = ref('')
const gridRef = ref(null)
const panelRef = ref(null)
// 缩放锚点：指向触发打开的文件夹磁贴中心，让面板"从磁贴展开、落回磁贴"而非屏幕中心
const panelOrigin = ref('50% 50%')

/* ---------- 封面流（cover flow）：3D 滚筒切换 ---------- */
/* 聚焦索引：相对 state.folders 数组；打开时定位到该文件夹，切换时循环滚动 */
const focusedIndex = ref(0)
const foldersList = computed(() => state.folders)
/* 渲染聚焦前后各 2 个面板（±2 作滚筒过渡缓冲，超出 ±1 隐藏）。
   key 策略：≥3 个文件夹用 folder.id（offset 变化 → DOM 复用 → transform 过渡出滚筒滚动）；
   <3 个时左右可能重复同一文件夹，改按 offset 作 key（牺牲位移动画，功能正常） */
const visibleFolders = computed(() => {
  const n = foldersList.value.length
  if (!n) return []
  if (n === 1) return [{ folder: foldersList.value[0], offset: 0 }]   // 单文件夹：无两侧
  /* 渲染所有文件夹，offset = 到聚焦索引的最短循环距离（每个文件夹唯一 key）。
     避免此前"聚焦 ±2"在文件夹数少时与 ±1 取到同一文件夹 → v-for key 冲突、面板叠加累积 */
  return foldersList.value.map((f, i) => {
    let off = i - focusedIndex.value
    if (off > n / 2) off -= n
    if (off < -n / 2) off += n
    return { folder: f, offset: off }
  })
})
/* 各面板 3D 定位：中间正视（0°），左侧 rotateY(+38°)、右侧 rotateY(-38°) 后退 + 缩小。
   两侧 transition 略慢 → 切换时面板间视差；filter 磨砂模糊 */
function panelStyle(off) {
  const dir = off < 0 ? 1 : -1
  const hidden = Math.abs(off) > 1
  const base = 'translate(-50%,-50%) translateX(' + (off * 42) + '%)'
  if (off === 0) {
    return {
      transform: base + ' rotateY(0deg) translateZ(0) scale(1)',
      opacity: 1, filter: 'none', zIndex: 4,
      pointerEvents: 'auto',
      transitionDuration: '.55s'
    }
  }
  return {
    transform: base + ' rotateY(' + (dir * 38) + 'deg) translateZ(-260px) scale(.72)',
    opacity: hidden ? 0 : .55,
    filter: hidden ? 'blur(5px)' : 'blur(9px) saturate(110%)',
    zIndex: hidden ? 1 : 3,
    pointerEvents: 'none',
    transitionDuration: '.68s'   // 两侧略慢 → 滚筒层次视差
  }
}
/* 快速切换检测：连续切换间隔 < 260ms 进入快速模式——缩短过渡、跳过跨界动画，避免动画叠加卡顿 */
let lastSwitchAt = 0
let fastTimer = null
const fastMode = ref(false)
function markSwitch() {
  const now = Date.now()
  fastMode.value = now - lastSwitchAt < 260
  lastSwitchAt = now
  clearTimeout(fastTimer)
  fastTimer = setTimeout(() => { fastMode.value = false }, 500)
}
/* 循环切换：focusedIndex 滚动，并同步 ui.folderOpenId（拖拽/添加/互斥 watch 均基于它） */
function switchFolder(dir) {
  const n = foldersList.value.length
  if (n < 2) return
  markSwitch()
  focusedIndex.value = (focusedIndex.value + dir + n) % n
  const f = foldersList.value[focusedIndex.value]
  if (f) ui.folderOpenId = f.id
}
/* 封面流跨界滑入：半圈文件夹（从隐藏区 |offset|>1 进入可见区）从对应外侧滑入，
   避免横穿（偶数环直径对面的文件夹从错误侧滑过）。
   左进 → 从更左滑入（从左往右）；右进 → 从更右滑入（从右往左） */
const prevOffsets = ref({})
function animateFromSide(el, offset) {
  const fromX = offset < 0 ? -72 : 72
  const angle = offset < 0 ? 38 : -38
  el.animate(
    [
      { transform: `translate(-50%,-50%) translateX(${fromX}%) rotateY(${angle}deg) translateZ(-260px) scale(.6)`, opacity: 0 },
      { transform: `translate(-50%,-50%) translateX(${offset * 42}%) rotateY(${angle}deg) translateZ(-260px) scale(.72)`, opacity: .55 }
    ],
    { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' }
  )
}
watch(visibleFolders, async () => {
  await nextTick()
  /* 先取消所有未完成的面板动画：快速切换时避免跨界动画叠加 / 卡在中间态 */
  document.querySelectorAll('.cf-panel').forEach(el => el.getAnimations().forEach(a => a.cancel()))
  if (fastMode.value) { prevOffsets.value = {}; return }   // 快速模式：跳过跨界动画，直接到位
  const prev = prevOffsets.value
  const next = {}
  visibleFolders.value.forEach(it => {
    const p = prev[it.folder.id]
    if (p !== undefined && Math.abs(p) > 1 && Math.abs(it.offset) <= 1) {
      const el = document.querySelector(`.cf-panel[data-fid="${it.folder.id}"]`)
      if (el) animateFromSide(el, it.offset)
    }
    next[it.folder.id] = it.offset
  })
  prevOffsets.value = next
})
/* 分页点：直接跳转到指定文件夹 */
function goToIndex(idx) {
  const n = foldersList.value.length
  if (idx < 0 || idx >= n || idx === focusedIndex.value) return
  markSwitch()
  focusedIndex.value = idx
  const f = foldersList.value[idx]
  if (f) ui.folderOpenId = f.id
}
/* 滚轮切换提示：打开文件夹时显示 5 秒后消失（封面流内切换不重复提示） */
const showHint = ref(false)
let hintTimer = null
function showWheelHint() {
  showHint.value = true
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { showHint.value = false }, 5000)
}
/* 新建空文件夹：生成不冲突名称，创建后聚焦打开 */
function addFolder() {
  let i = 1
  let title = '新文件夹'
  const names = new Set(state.folders.map(f => f.title))
  while (names.has(title)) { i++; title = '新文件夹 ' + i }
  const f = { id: uid(), title }
  state.folders.push(f)
  save()
  const idx = state.folders.findIndex(x => x.id === f.id)
  goToIndex(idx)   // 聚焦并打开新文件夹
  toast('已创建「' + title + '」')
}
/* 滚轮：仅在磁贴网格外的面板区域切文件夹；网格内保持原滚动（链接多时需要滚动） */
function onWheel(e) {
  if (e.target.closest('.fp-grid')) return
  e.preventDefault()
  switchFolder(e.deltaY > 0 ? 1 : -1)
}

watch(() => ui.folderOpenId, async (id, prev) => {
  editing.value = false
  /* 打开时保留当前文件夹：关闭后 folderOpenId 清空，computed 回退到 displayFolder，
     面板才不立即卸载，能完整播放关闭动画（翻转落回磁贴） */
  if (id) displayFolder.value = state.folders.find(f => f.id === id) || null
  if (!id) return
  /* 聚焦索引同步到打开的文件夹（打开 / 封面流切换都同步） */
  const idx = state.folders.findIndex(f => f.id === id)
  if (idx > -1) focusedIndex.value = idx
  /* 仅"真正打开"（从无到有）时显示滚轮提示并更新展开锚点；封面流内切换（prev 非空）不做 */
  if (prev) return
  showWheelHint()
  const tile = document.querySelector(`.folder-tile[data-fid="${id}"]`)
  if (!tile) { panelOrigin.value = '50% 50%'; return }
  const r = tile.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  await nextTick()   // 等面板渲染并 flex 居中后再测量，换算相对面板左上角的偏移
  const pr = panelRef.value ? panelRef.value.getBoundingClientRect() : null
  panelOrigin.value = pr ? `${cx - pr.left}px ${cy - pr.top}px` : '50% 50%'
})
// 动画结束后清掉 displayFolder（打开时 folder 走 folderOpenId，仅关闭动画回退用 displayFolder）
function onAnimationEnd(e) {
  if (e.target !== e.currentTarget) return
  /* 仅关闭动画（backdrop fadeOut）结束时清 displayFolder；
     打开动画（fadeIn）结束不清，否则关闭时面板无内容可回退、直接卸载，关闭动画失效 */
  if (!ui.folderClosing) return
  displayFolder.value = null
}

function startEdit() { editing.value = true; editTitle.value = folder.value?.title || '' }
function commitEdit() {
  if (ui.folderOpenId && editTitle.value.trim()) renameFolder(ui.folderOpenId, editTitle.value)
  editing.value = false
}

/* ---------- 文件夹内拖拽排序（实时换位：拖动中让位，松手落位，拖出恢复） ---------- */
let folderDragId = null
let folderDragOrder = []
let folderDropped = false
let folderLastMove = 0
let folderLastTarget = -1
/* 透明拖拽镜像：隐藏浏览器默认 drag image，避免"双层"图标 */
const folderEmptyImg = new Image()
folderEmptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
function startFolderLinkDrag(e, l) {
  e.dataTransfer.setData('text/link', l.id)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setDragImage(folderEmptyImg, 0, 0)
  folderDragId = l.id
  folderDropped = false
  folderLastTarget = -1; folderLastMove = 0
  folderDragOrder = state.links.filter(x => x.folderId === ui.folderOpenId).map(x => x.id)
  e.currentTarget.classList.add('dragging')
}
function endFolderLinkDrag(e) {
  e.currentTarget.classList.remove('dragging')
  if (!folderDropped && ui.folderOpenId) {
    // 拖出/取消：恢复文件夹内顺序
    state.links = [
      ...state.links.filter(x => x.folderId !== ui.folderOpenId),
      ...folderDragOrder.map(id => state.links.find(x => x.id === id)).filter(Boolean)
    ]
  }
  folderDragId = null
  clearDropLine()
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
function clearDropLine() { folderLastTarget = -1 }

function onGridDrop(e) {
  e.preventDefault()
  const lid = e.dataTransfer.getData('text/link')
  if (!lid || !ui.folderOpenId) { clearDropLine(); return }
  const l = state.links.find(x => x.id === lid)
  if (!l) { clearDropLine(); return }
  folderDropped = true
  if (l.folderId !== ui.folderOpenId) {
    // 跨文件夹拖入：移入并追加到末尾（同文件夹已在拖动中实时排序）
    l.folderId = ui.folderOpenId
    pruneEmptyFolders()
    let arr = state.links.filter(x => x.folderId === ui.folderOpenId && x.id !== lid)
    arr.push(l)
    state.links = [
      ...state.links.filter(x => x.folderId !== ui.folderOpenId),
      ...arr.map(x => x.id).map(id => state.links.find(x => x.id === id)).filter(Boolean)
    ]
  }
  save()
  clearDropLine()
}
function onGridDragover(e) {
  if (e.dataTransfer.types.includes('text/link')) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    const grid = gridRef.value?.$el
    if (grid) moveFolderLink(e.clientX, e.clientY)
  }
}
/* 实时换位：拖动中把文件夹内被拖链接移到目标位 */
function moveFolderLink(clientX, clientY) {
  const now = Date.now()
  if (now - folderLastMove < 50) return
  folderLastMove = now
  const grid = gridRef.value?.$el
  if (!grid || !ui.folderOpenId || !folderDragId) return
  const target = computeInsertIndex(grid, clientX, clientY).index
  if (target === folderLastTarget) return
  folderLastTarget = target
  const l = state.links.find(x => x.id === folderDragId)
  if (!l) return
  let arr = state.links.filter(x => x.folderId === ui.folderOpenId)
  const oi = arr.findIndex(x => x.id === folderDragId)
  if (oi > -1) arr.splice(oi, 1)
  arr.splice(Math.max(0, Math.min(target, arr.length)), 0, l)
  const ids = arr.map(x => x.id)
  state.links = [
    ...state.links.filter(x => x.folderId !== ui.folderOpenId),
    ...ids.map(id => state.links.find(x => x.id === id)).filter(Boolean)
  ]
}
onBeforeUnmount(() => { clearDropLine(); clearTimeout(hintTimer) })

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
       @animationend="onAnimationEnd">
    <!-- 封面流滚筒：中间聚焦（完整交互）+ 左右模糊预览。
         空白关闭由 App.onClick 统一收口（先关表单再关文件夹，避免抢跑）。
         fast 类：快速连续切换时缩短过渡，动画直接到位不卡顿 -->
    <div class="cf" :class="{ fast: fastMode }" @wheel="onWheel">
      <div v-for="it in visibleFolders" :key="it.folder.id" class="cf-panel" :data-fid="it.folder.id" :style="panelStyle(it.offset)">
        <template v-if="Math.abs(it.offset) <= 1">
        <!-- 中间：聚焦面板，保留完整交互（拖拽/编辑/添加/删除） -->
        <div v-if="it.offset === 0 && folder" ref="panelRef" class="folder-panel" :style="{ transformOrigin: panelOrigin }">
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

          <TransitionGroup tag="div" name="tile" class="fp-grid" ref="gridRef" @dragover="onGridDragover" @drop="onGridDrop">
            <div v-for="l in links" :key="l.id"
                 class="tile" :data-id="l.id" draggable="true"
                 @click="openLink(l)"
                 @dragstart="startFolderLinkDrag($event, l)"
                 @dragend="endFolderLinkDrag($event)">
              <div class="t-ico" :data-ic="l.iconMode">
                <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                     @error="onImgError" @load="onImgLoad">
                <LetterIco :letter="letterOf(l.title)" :style="letterStyle(l)" />
              </div>
              <div class="t-name">{{ l.title }}</div>
            </div>

            <div class="tile add" key="add" @click.stop="openAddForm($event.currentTarget, folder.id)">
              <div class="plus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            </div>
          </TransitionGroup>
        </div>
        <!-- 两侧：模糊预览 -->
        <FolderPreview v-else :folder="it.folder" />
        </template>
        <!-- 远处面板：轻量占位（key 唯一 + 滚筒进入过渡，不渲染磁贴省 DOM） -->
        <div v-else class="cf-blank"></div>
      </div>

      <!-- 左右切换箭头 -->
      <button class="cf-arrow cf-arrow-l" title="上一个文件夹" @click.stop="switchFolder(-1)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="cf-arrow cf-arrow-r" title="下一个文件夹" @click.stop="switchFolder(1)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      <!-- 分页指示：当前文件夹为加长高亮条，点击直接跳转到对应文件夹 -->
      <div class="cf-dots">
        <!-- 滚轮切换提示：无背景无边框纯文字，打开时显示 5 秒消失 -->
        <Transition name="cfhint">
          <span v-if="showHint" class="cf-hint">滚轮滚动以切换文件夹</span>
        </Transition>
        <button v-for="(f, i) in foldersList" :key="f.id" class="cf-dot"
                :class="{ on: i === focusedIndex }" :title="f.title" @click.stop="goToIndex(i)"></button>
        <!-- 新建文件夹 -->
        <button class="cf-add" title="新建文件夹" @click.stop="addFolder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

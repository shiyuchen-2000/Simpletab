<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { state, ui, save, uid, toast, letterOf, openAddForm, deleteFolder, renameFolder, closeFolder, pruneEmptyFolders, openLinkUrl } from '../store'
import { faviconSrc, isDarkIcon } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

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
/* 函数 ref：这两个元素都在 v-for 内部，字符串 ref 会被 Vue 收集成数组，
   直接 .value.getBoundingClientRect() / .$el 会失效（曾报 getBoundingClientRect is not a function） */
const gridEl = ref(null)
const panelEl = ref(null)
const setGridEl = el => { gridEl.value = el }
const setPanelEl = el => { panelEl.value = el }

/* 左上角缩略卡片：固定在"面板左上角 45° 外侧"的基准位置。
   面板高度随文件夹内容变化，若按实时高度计算，切几个文件夹卡片就会上下漂移；
   因此使用固定基准高度 MINI_BASE_H，位置只随窗口尺寸变化，切换文件夹时不动
   （MINI_OFFSET = 卡片 96 + 间隙 16） */
const MINI_OFFSET = 104   // 卡片 88 + 间隙 16
const MINI_BASE_H = 350
const MINI_TOP_SHIFT = 50   // 在基准位置基础上再整体下移 50px
const miniPos = ref({ left: '0px', top: '0px' })
function updateMiniPos() {
  const w = Math.min(620, innerWidth * 0.92)
  miniPos.value = {
    left: Math.round((innerWidth - w) / 2 - MINI_OFFSET) + 'px',
    top: Math.round((innerHeight - MINI_BASE_H) / 2 - MINI_OFFSET + MINI_TOP_SHIFT) + 'px'
  }
}
updateMiniPos()
if (typeof window !== 'undefined') window.addEventListener('resize', updateMiniPos)
// 缩放锚点：指向触发打开的文件夹磁贴中心，让面板"从磁贴展开、落回磁贴"而非屏幕中心
const panelOrigin = ref('50% 50%')

/* ---------- 封面流（cover flow）：3D 滚筒切换 ---------- */
/* 聚焦索引：相对 state.folders 数组；打开时定位到该文件夹，切换时循环滚动 */
const focusedIndex = ref(0)
const foldersList = computed(() => state.folders)
/* 左上角缩略卡片栈：当前文件夹 + 后两个（循环）。切换时最前卡片退走、后面的前移补位 */
const miniStack = computed(() => {
  const list = foldersList.value
  const n = list.length
  if (!n || !folder.value) return []
  const cur = list.findIndex(f => f.id === folder.value.id)
  const start = cur >= 0 ? cur : 0
  return Array.from({ length: Math.min(3, n) }, (_, d) => {
    const f = list[(start + d) % n]
    /* 只有最前一张需要图标；后两层只做卡片边缘占位 */
    return { folder: f, depth: d, links: d === 0 ? state.links.filter(l => l.folderId === f.id).slice(0, 4) : [] }
  })
})
let folderEnterTimer = null
/* 堆叠层的位置/缩放：越靠后越向右上错开、越小越淡 */
function miniCardStyle(depth) {
  const y = depth * 7
  return {
    transform: `translate(${y}px, ${-y}px) scale(${1 - depth * 0.055})`,
    opacity: 1 - depth * 0.2,
    zIndex: 10 - depth
  }
}
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
/* 只保留中间面板：左右两侧预览及其模糊/位移动画全部去掉，
   减少大尺寸 filter/backdrop 合成层，切换时只播放入场动画 */
function panelStyle(off) {
  if (off === 0) {
    return {
      transform: 'translate(-50%,-50%) translateZ(0) scale(1)',
      opacity: 1, filter: 'none', zIndex: 4, pointerEvents: 'auto'
    }
  }
  /* transform 必须与中间面板一致：若隐藏态用 none，切换时 CSS transition 会把
     translate(-50%,-50%) 也当成位移来过渡，面板会从右下角滑进来（看起来一直在晃） */
  return {
    transform: 'translate(-50%,-50%) translateZ(0) scale(1)',
    opacity: 0, visibility: 'hidden', zIndex: 1, pointerEvents: 'none'
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
/* 滚轮切换锁：触控板一次滑动会连续触发 wheel，避免一次跳过多个文件夹 */
let wheelLockedAt = 0
const WHEEL_LOCK_MS = 160
function onWheel(e) {
  /* 网格确实可滚动时保留内部滚动；内容不足以滚动时，滚轮照常切换文件夹，
     否则鼠标停在面板的磁贴区上方会完全没反应（"有时候不跟手"） */
  const grid = e.target.closest('.fp-grid')
  if (grid && grid.scrollHeight > grid.clientHeight + 1) return
  e.preventDefault()
  const now = Date.now()
  if (now - wheelLockedAt < WHEEL_LOCK_MS) return
  wheelLockedAt = now
  switchFolder(e.deltaY > 0 ? 1 : -1)
}

/* 文件夹打开 / 关闭动画期间标记 body：暂停全屏折射与磁贴采样，
   动画结束后立即恢复，静止打开时背后的液态玻璃仍可见 */
let folderAnimTimer = null
function markFolderAnimating(ms) {
  document.body.classList.add('folder-animating')
  clearTimeout(folderAnimTimer)
  folderAnimTimer = setTimeout(() => document.body.classList.remove('folder-animating'), ms)
}

watch(() => ui.folderOpenId, async (id, prev) => {
  markFolderAnimating(id ? 850 : 550)
  editing.value = false
  /* 打开时保留当前文件夹：关闭后 folderOpenId 清空，computed 回退到 displayFolder，
     面板才不立即卸载，能完整播放关闭动画（翻转落回磁贴） */
  if (id) displayFolder.value = state.folders.find(f => f.id === id) || null
  if (!id) {
    document.body.classList.remove('folder-entering')
    /* 关闭：缩略卡落回原文件夹磁贴位置（与面板关闭动画同步，约 200ms） */
    const mini = document.querySelector('.fp-mini-stack')
    const tile = prev ? document.querySelector(`.folder-tile[data-fid="${prev}"]`) : null
    if (mini && tile) {
      const mr = mini.getBoundingClientRect()
      const tr = tile.getBoundingClientRect()
      const dx = Math.round((tr.left + tr.width / 2) - (mr.left + mr.width / 2))
      const dy = Math.round((tr.top + tr.height / 2) - (mr.top + mr.height / 2))
      mini.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(.72)`, opacity: 0 }
        ],
        { duration: 200, easing: 'cubic-bezier(.4,0,1,1)' }
      )
    }
    return
  }
  /* 聚焦索引同步到打开的文件夹（打开 / 封面流切换都同步） */
  const idx = state.folders.findIndex(f => f.id === id)
  if (idx > -1) focusedIndex.value = idx
  /* 封面流内切换（prev 非空）：不播放入场衔接，只移除打开延迟 */
  if (prev) {
    document.body.classList.remove('folder-entering')
    return
  }
  /* 真正打开：缩略卡先从磁贴飞入，面板稍后从缩略卡位置展开 */
  document.body.classList.add('folder-entering')
  clearTimeout(folderEnterTimer)
  folderEnterTimer = setTimeout(() => document.body.classList.remove('folder-entering'), 1200)
  showWheelHint()
  const tile = document.querySelector(`.folder-tile[data-fid="${id}"]`)
  if (!tile) {
    document.body.classList.remove('folder-entering')
    panelOrigin.value = '50% 50%'
    return
  }
  const r = tile.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  await nextTick()   // 等面板渲染并 flex 居中后再测量
  /* 面板 origin 指向缩略卡中心（不再指向磁贴）：文件夹从缩略图里展开 */
  const w = panelEl.value ? panelEl.value.offsetWidth : 620
  const h = panelEl.value ? panelEl.value.offsetHeight : 400
  const pl = (innerWidth - w) / 2
  const pt = (innerHeight - h) / 2
  const ml = parseFloat(miniPos.value.left) || 0
  const mt = parseFloat(miniPos.value.top) || 0
  panelOrigin.value = `${Math.round(ml + 44 - pl)}px ${Math.round(mt + 44 - pt)}px`
  /* 缩略卡先飞入 320ms；面板入场由 body.folder-entering 延迟 280ms */
  const mini = document.querySelector('.fp-mini-stack')
  if (mini) {
    const mr = mini.getBoundingClientRect()
    const dx = Math.round(cx - (mr.left + mr.width / 2))
    const dy = Math.round(cy - (mr.top + mr.height / 2))
    mini.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(.72)`, opacity: 0 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' }
    )
  }
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
const folderDragId = ref(null)
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
  folderDragId.value = l.id
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
  folderDragId.value = null
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
    const grid = gridEl.value?.$el || gridEl.value
    if (grid) moveFolderLink(e.clientX, e.clientY)
  }
}
/* 实时换位：拖动中把文件夹内被拖链接移到目标位 */
function moveFolderLink(clientX, clientY) {
  const now = Date.now()
  if (now - folderLastMove < 50) return
  folderLastMove = now
  const grid = gridEl.value?.$el || gridEl.value
  if (!grid || !ui.folderOpenId || !folderDragId.value) return
  const target = computeInsertIndex(grid, clientX, clientY).index
  if (target === folderLastTarget) return
  folderLastTarget = target
  const l = state.links.find(x => x.id === folderDragId.value)
  if (!l) return
  let arr = state.links.filter(x => x.folderId === ui.folderOpenId)
  const oi = arr.findIndex(x => x.id === folderDragId.value)
  if (oi > -1) arr.splice(oi, 1)
  arr.splice(Math.max(0, Math.min(target, arr.length)), 0, l)
  const ids = arr.map(x => x.id)
  state.links = [
    ...state.links.filter(x => x.folderId !== ui.folderOpenId),
    ...ids.map(id => state.links.find(x => x.id === id)).filter(Boolean)
  ]
}
onBeforeUnmount(() => {
  clearDropLine(); clearTimeout(hintTimer)
  clearTimeout(folderEnterTimer)
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateMiniPos)
})

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
    <!-- 左上角缩略卡片栈：独立定位，不随面板动画；切换时最前卡退走、后面卡前移补位 -->
    <TransitionGroup name="mini" tag="div" class="fp-mini-stack" :style="miniPos" aria-hidden="true">
      <div v-for="m in miniStack" :key="m.folder.id" class="fp-mini-card" :style="miniCardStyle(m.depth)">
        <template v-if="m.depth === 0">
          <template v-if="m.links.length">
            <div v-for="l in m.links" :key="l.id" class="fp-mini-cell">
              <!-- 与主界面一致：文字图标只显示字母；原始图标才加载 favicon -->
              <LetterIco :letter="letterOf(l.title)" />
              <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" :class="{ 'dark-icon': isDarkIcon(l.url) }" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                   @error="e => e.target.remove()">
            </div>
          </template>
          <div v-else class="fp-mini-add">+</div>
        </template>
      </div>
    </TransitionGroup>
    <!-- 封面流滚筒：中间聚焦（完整交互）+ 左右模糊预览。
         空白关闭由 App.onClick 统一收口（先关表单再关文件夹，避免抢跑）。
         fast 类：快速连续切换时缩短过渡，动画直接到位不卡顿 -->
    <div class="cf" :class="{ fast: fastMode }" @wheel="onWheel">
      <div v-for="it in visibleFolders" :key="it.folder.id" class="cf-panel" :data-fid="it.folder.id" :style="panelStyle(it.offset)">
        <template v-if="it.offset === 0">
        <!-- 中间：聚焦面板，保留完整交互（拖拽/编辑/添加/删除） -->
        <div v-if="folder" :ref="setPanelEl" class="folder-panel" :style="{ transformOrigin: panelOrigin }">
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

          <TransitionGroup tag="div" name="tile" class="fp-grid" :ref="setGridEl"
                          :class="{ 'is-dragging': !!folderDragId }"
                          @dragover="onGridDragover" @drop="onGridDrop">
            <div v-for="l in links" :key="l.id"
                 class="tile" :data-id="l.id" draggable="true"
                 @click="openLink(l)"
                 @dragstart="startFolderLinkDrag($event, l)"
                 @dragend="endFolderLinkDrag($event)">
              <div class="t-ico" :data-ic="l.iconMode">
                <img v-if="l.iconMode !== 'text' && faviconSrc(l.url)" :src="faviconSrc(l.url)" :class="{ 'dark-icon': isDarkIcon(l.url) }" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
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
        </template>
        <!-- 两侧/远处：轻量占位，不渲染内容（左右预览已移除） -->
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

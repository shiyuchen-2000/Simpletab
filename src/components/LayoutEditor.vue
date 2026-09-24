<script setup>
import { ref, onBeforeUnmount, watch, nextTick } from 'vue'
import { ui, state, save, resolveLayout, applyLayoutVars } from '../store'

/* 页面布局全屏编辑器：虚线框占位拖拽（无遮罩），实时驱动真实元素位置预览；
   虚线框尺寸按真实元素测量；虚线框/工具栏均直接 DOM 拖拽，保证跟手无瞬移 */
const edit = ref(null)   // { clock:{x,y,size,baseW,baseH}, search:{x,y,width,realW,realH}, dock:{x,y,realW,realH} }
let drag = null          // { kind, offX, offY, ox, oy }
let handleEl = null      // 当前拖拽的虚线框元素（onMove 直接改 DOM，避免 Vue 异步延迟）
let barDrag = null       // 工具栏拖动 { startX, startY, left, top }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

watch(() => ui.layoutEdit, v => { if (v) begin() })
function begin() {
  const cur = resolveLayout()
  edit.value = { clock: { ...cur.clock }, search: { ...cur.search }, dock: { ...cur.dock } }
  /* 编辑器打开时已切到主页（openLayoutEditor），等渲染完成后再测量真实尺寸 */
  nextTick(() => requestAnimationFrame(measureReal))
}
/* 测量真实元素尺寸：让虚线框与实际元素一致 */
function measureReal() {
  const e = edit.value; if (!e) return
  const c = document.querySelector('#clockWrap')
  if (c) {
    const r = c.getBoundingClientRect()
    if (r.width) {
      e.clock.baseW = Math.round(r.width * 100 / e.clock.size)   // 反推 scale=100% 时的基础尺寸
      e.clock.baseH = Math.round(r.height * 100 / e.clock.size)
    }
  }
  const s = document.querySelector('#searchBar')
  if (s) {
    const r = s.getBoundingClientRect()
    if (r.width) { e.search.realW = Math.round(r.width); e.search.realH = Math.round(r.height) }
  }
  const d = document.querySelector('.dock')
  if (d) {
    const r = d.getBoundingClientRect()
    if (r.width) { e.dock.realW = Math.round(r.width); e.dock.realH = Math.round(r.height) }
  }
}
/* 把编辑坐标实时写入 CSS 变量（真实元素跟随移动预览） */
function writeVars() {
  const e = edit.value; if (!e) return
  const r = document.documentElement
  r.style.setProperty('--clock-x', e.clock.x + '%'); r.style.setProperty('--clock-y', e.clock.y + '%')
  r.style.setProperty('--clock-scale', String(e.clock.size / 100))
  r.style.setProperty('--search-x', e.search.x + '%'); r.style.setProperty('--search-y', e.search.y + '%')
  r.style.setProperty('--search-w', e.search.width + 'px')
  r.style.setProperty('--dock-x', e.dock.x + '%'); r.style.setProperty('--dock-y', e.dock.y + '%')
}
/* 各元素渲染尺寸（优先用测量值，未测到回退近似，用于边缘约束与重叠检测） */
function elSize(kind) {
  const e = edit.value[kind]
  if (kind === 'clock') return [(e.baseW || 280) * e.size / 100, (e.baseH || 150) * e.size / 100]
  if (kind === 'search') return [e.width, e.realH || 66]
  return [e.realW || 300, e.realH || 78]
}
/* 各元素近似矩形（用于重叠检测） */
function elRect(kind) {
  const s = elSize(kind)
  const cx = edit.value[kind].x / 100 * innerWidth, cy = edit.value[kind].y / 100 * innerHeight
  return { l: cx - s[0] / 2, r: cx + s[0] / 2, t: cy - s[1] / 2, b: cy + s[1] / 2 }
}
function hasOverlap(kind) {
  const a = elRect(kind)
  return ['clock', 'search', 'dock'].some(k => {
    if (k === kind) return false
    const b = elRect(k)
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
  })
}
function startDrag(kind, e) {
  if (!edit.value) return
  e.preventDefault()
  handleEl = e.currentTarget
  const rect = handleEl.getBoundingClientRect()
  /* offX/offY 相对元素中心：虚线框是「中心 + translate(-50%)」定位，
     若按左缘算偏移，拖动瞬间会跳半个元素宽高（时钟框大跳得明显），故按中心算 */
  drag = { kind, offX: e.clientX - (rect.left + rect.width / 2), offY: e.clientY - (rect.top + rect.height / 2), ox: edit.value[kind].x, oy: edit.value[kind].y }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function onMove(e) {
  if (!drag || !edit.value) return
  const k = drag.kind
  const px = e.clientX - drag.offX, py = e.clientY - drag.offY
  const [w, h] = elSize(k)
  /* 元素中心受自身尺寸约束：保证整体不超出窗口边界（贴边停住，不越界） */
  const x = clamp(px, w / 2, innerWidth - w / 2)
  const y = clamp(py, h / 2, innerHeight - h / 2)
  edit.value[k].x = Math.round(x / innerWidth * 1000) / 10
  edit.value[k].y = Math.round(y / innerHeight * 1000) / 10
  if (hasOverlap(k)) { edit.value[k].x = drag.ox; edit.value[k].y = drag.oy }   // 重叠：拒绝回弹
  else { drag.ox = edit.value[k].x; drag.oy = edit.value[k].y }
  writeVars()
  /* 虚线框位置直接改 DOM：与真实元素（CSS 变量同步生效）零延迟，拖拽跟手 */
  if (handleEl) { handleEl.style.left = edit.value[k].x + '%'; handleEl.style.top = edit.value[k].y + '%' }
}
function onUp() { drag = null; handleEl = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }

/* 工具栏：可拖动（空白处按住拖动，按钮 / 滑杆不触发），避免固定在底部挡住元素 */
function onBarDown(e) {
  if (e.target.closest('button, input, label')) return
  e.preventDefault()
  const bar = document.querySelector('.le-bar')
  if (!bar) return
  const r = bar.getBoundingClientRect()
  barDrag = { startX: e.clientX, startY: e.clientY, left: r.left, top: r.top }
  window.addEventListener('mousemove', onBarMove)
  window.addEventListener('mouseup', onBarUp)
}
function onBarMove(e) {
  if (!barDrag) return
  const bar = document.querySelector('.le-bar')
  if (!bar) return
  bar.style.left = (barDrag.left + e.clientX - barDrag.startX) + 'px'
  bar.style.top = (barDrag.top + e.clientY - barDrag.startY) + 'px'
  bar.style.bottom = 'auto'   // 清除默认 bottom，避免 top/bottom 同设把工具栏拉伸
  bar.style.transform = 'none'   // 覆盖默认 translateX(-50%) 居中定位
}
function onBarUp() {
  barDrag = null
  window.removeEventListener('mousemove', onBarMove)
  window.removeEventListener('mouseup', onBarUp)
}

function handleStyle(k) {
  const e = edit.value; if (!e) return {}
  const w = k === 'clock' ? (e.clock.baseW || 280) * e.clock.size / 100
    : k === 'search' ? e.search.width : (e.dock.realW || 300)
  const h = k === 'clock' ? (e.clock.baseH || 150) * e.clock.size / 100
    : k === 'search' ? (e.search.realH || 66) : (e.dock.realH || 78)
  return { left: e[k].x + '%', top: e[k].y + '%', width: w + 'px', height: h + 'px' }
}
function saveLayout() {
  if (!edit.value) return
  /* 只保存坐标/大小/宽度字段，不含测量用临时字段 */
  state.layoutCustom = {
    clock: { x: edit.value.clock.x, y: edit.value.clock.y, size: edit.value.clock.size },
    search: { x: edit.value.search.x, y: edit.value.search.y, width: edit.value.search.width },
    dock: { x: edit.value.dock.x, y: edit.value.dock.y }
  }
  save(); ui.layoutEdit = false   // 保存后直接回到搜索页（主页）
}
function cancelLayout() { applyLayoutVars(); ui.layoutEdit = false; ui.modal = 'settings' }
/* 重置：清除自定义并恢复默认居中布局（时钟顶 / 搜索框中 / 拓展坞底） */
function resetLayout() {
  state.layoutCustom = null
  state.clockPos = 'top'
  state.searchPos = 'mid'
  state.dockPos = 'bottom'
  save(); applyLayoutVars(); begin()
}
function setSize(kind, key, val) { edit.value[kind][key] = +val; writeVars() }
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('mousemove', onBarMove)
  window.removeEventListener('mouseup', onBarUp)
})
</script>

<template>
  <div class="layout-edit" v-if="ui.layoutEdit">
    <div v-for="k in ['clock', 'search', 'dock']" :key="k"
         class="le-handle" :class="'le-' + k"
         :style="handleStyle(k)"
         @mousedown="startDrag(k, $event)">
      <span>{{ k === 'clock' ? '时钟' : k === 'search' ? '搜索框' : '拓展坞' }}</span>
    </div>
    <div class="le-bar" @mousedown="onBarDown">
      <span class="le-grip" title="按住可拖动工具栏">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="2" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="2" cy="14" r="1.3"/><circle cx="8" cy="14" r="1.3"/></svg>
      </span>
      <em class="le-hint">拖动虚线框调整位置，元素实时跟随</em>
      <label>时钟大小<input type="range" min="80" max="150" :value="edit && edit.clock.size" @input="setSize('clock', 'size', $event.target.value)"><b>{{ edit ? edit.clock.size : 100 }}%</b></label>
      <label>搜索宽度<input type="range" min="240" max="720" :value="edit && edit.search.width" @input="setSize('search', 'width', $event.target.value)"><b>{{ edit ? edit.search.width : 400 }}px</b></label>
      <button class="btn-mini" @click="resetLayout">重置</button>
      <button class="btn btn-ghost" @click="cancelLayout">取消</button>
      <button class="btn btn-primary" @click="saveLayout">保存布局</button>
    </div>
  </div>
</template>

<style scoped>
.layout-edit{position:fixed;inset:0;z-index:2000;}
.le-handle{position:fixed;transform:translate(-50%,-50%);border:2px dashed var(--accent);border-radius:14px;
  display:flex;align-items:center;justify-content:center;color:var(--text);font-size:13px;letter-spacing:.12em;
  background:rgba(var(--accent-rgb),.08);cursor:grab;user-select:none;box-sizing:border-box;transition:border-color .2s,background .2s;}
.le-handle:hover{border-color:var(--accent-text);background:rgba(var(--accent-rgb),.16);}
.le-handle:active{cursor:grabbing;}
.le-handle span{pointer-events:none;}
.le-bar{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;
  justify-content:center;white-space:nowrap;
  padding:14px 22px;border-radius:16px;background:var(--glass-modal);border:1px solid var(--glass-border);
  backdrop-filter:blur(24px) saturate(170%);-webkit-backdrop-filter:blur(24px) saturate(170%);
  color:var(--text);font-size:13px;z-index:2001;box-shadow:0 18px 50px rgba(0,0,0,.35);cursor:grab;user-select:none;}
.le-bar:active{cursor:grabbing;}
.le-hint{font-style:normal;font-weight:400;font-size:.76rem;color:var(--text-faint);margin-right:6px;letter-spacing:.02em;}
.le-grip{flex:none;display:grid;place-items:center;color:var(--text-faint);cursor:grab;padding:6px;border-radius:8px;transition:background .2s,color .2s;}
.le-grip:hover{background:rgba(var(--accent-rgb),.12);color:var(--accent-text);}
.le-bar label{display:flex;align-items:center;gap:8px;}
.le-bar input[type="range"]{accent-color:var(--accent);}
.le-bar b{color:var(--accent-text);font-variant-numeric:tabular-nums;min-width:44px;text-align:right;}
</style>

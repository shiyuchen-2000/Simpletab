<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { state, ui, setView } from '../store'

/* 引导步骤：target 为空时气泡居中；target 也可为函数（动态目标，如第 5 步表单开合时切换聚焦）；
   expect 在用户完成实际操作后自动前进（保留「下一步」兜底）；
   onEnter 进入步骤时执行（如关闭遗留的添加表单） */
let step5Opened = false   // 第 5 步：记录表单是否已打开过，等关闭后才前进
const STEPS = [
  { view: 'home', target: '', title: '欢迎使用 SimpleTab 简页',
    desc: '花一分钟了解**核心功能**，随时点击右上角**「跳过引导」**退出。' },
  { view: 'home', target: '.search-bar', title: '直接搜索',
    desc: '在这里**输入内容按回车**即可搜索；点击左侧胶囊或按 **Tab** 键**切换搜索引擎**。现在可以试着输入。' },
  { view: 'home', target: '.dock', title: '拓展坞',
    desc: '常用网站固定在**屏幕底部**，点击**一键直达**；右键磁贴选择**「添加到拓展坞」**即可固定。' },
  { view: 'home', target: '#clockWrap', title: '进入快捷链接页',
    desc: '**点击顶部时间区域**（或**右键空白处**）进入快捷链接页——现在就试试！',
    rightClickEnterLinks: true,   // 仅此步骤允许引导期间右键空白进入链接页
    expect: () => state.view === 'links' },
  { view: 'links', target: () => (ui.linkForm.visible ? '.overlay-form' : '.tile.add'), title: '添加链接',
    desc: '点击这个**「+」磁贴**，填入**名称和网址**后点**「添加」**保存。',
    onEnter: () => { step5Opened = false },
    expect: () => {
      if (ui.linkForm.visible) step5Opened = true
      return step5Opened && !ui.linkForm.visible
    } },
  { view: 'links', target: '.tile:not(.add):not(.folder-tile)', title: '管理链接',
    desc: '**右键任意磁贴**打开操作菜单：**编辑、删除、移入文件夹**、添加到拓展坞。',
    onEnter: () => { ui.linkForm.visible = false } },
  { view: 'home', target: '', title: '一切就绪！',
    desc: '基础用法就是这些。打开右上角**设置**还能自定义主题、壁纸、图标样式和布局。祝使用愉快！' }
]

const stepIdx = ref(0)
const ready = ref(false)
const rect = ref(null)          // 聚焦挖洞 {top,left,width,height}；null 表示无目标（气泡居中）
const bubbleH = ref(0)          // 气泡实测高度（上方/居中定位用）
const bubbleRef = ref(null)
let ro = null                   // 跟随目标尺寸变化（搜索框 hover 展开等）

const step = computed(() => STEPS[stepIdx.value])
const isLast = computed(() => stepIdx.value === STEPS.length - 1)

/* 将 desc 中的 **重点** 渲染为主题色高亮（内容均为本文件硬编码，无用户输入，v-html 安全） */
function hlText(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<span class="tb-hl">$1</span>')
}

/* 表单 / 菜单打开时（气泡让路期间）的页内操作提示：点空白处关闭 */
const hintText = computed(() => {
  if (!ui.tourActive) return ''
  if (ui.linkForm.visible) return '点空白处关闭窗口，继续引导'
  if (ui.ctxMenu.visible) return '点空白处关闭菜单，继续引导'
  return ''
})

/* 等待当前视图入场动画（zoomIn 等）播完再测量，避免动画中拿到的位置是缩放中间态导致挖洞偏移 */
async function waitViewAnim() {
  const sec = document.getElementById(state.view === 'links' ? 'linksSection' : 'homeSection')
  const anims = sec ? sec.getAnimations() : []
  if (!anims.length) return
  await Promise.race([
    Promise.all(anims.map(a => a.finished.catch(() => {}))),
    new Promise(r => setTimeout(r, 900))
  ])
}

/* 解析当前步骤的目标元素：target 可为字符串选择器或返回选择器的函数（动态目标） */
function resolveTargetEl() {
  const t = step.value.target
  if (typeof t === 'function') { const sel = t(); return sel ? document.querySelector(sel) : null }
  return t ? document.querySelector(t) : null
}

/* 按目标当前位置刷新挖洞 */
function reposition() {
  const el = resolveTargetEl()
  if (!el) { rect.value = null; return }
  const r = el.getBoundingClientRect()
  const pad = 10
  rect.value = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
}

async function measure() {
  ready.value = false
  if (ro) { ro.disconnect(); ro = null }
  const s = step.value
  if (s.onEnter) s.onEnter()
  if (state.view !== s.view) setView(s.view)
  await nextTick()          // 等视图切换渲染、入场动画注册
  await waitViewAnim()      // 等动画播完，位置才稳定
  await new Promise(r => setTimeout(r, 60))
  reposition()
  await nextTick()
  if (bubbleRef.value) bubbleH.value = bubbleRef.value.offsetHeight
  ready.value = true
  const el = resolveTargetEl()
  if (el && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => reposition())
    ro.observe(el)
  }
}

/* 动态目标（函数式 target）：目标元素随状态切换时重新定位并换绑观察器。
   若目标为表单弹窗，先等其 zoomIn 弹出动画播完再测量，避免 scale 中间态导致挖洞偏移盖住弹窗 */
function refreshDynamic() {
  console.log('[TD] refreshDynamic enter, visible=', ui.linkForm.visible, 'ro=', !!ro)
  if (typeof step.value.target !== 'function') return
  if (ro) { ro.disconnect(); ro = null }
  const form = document.querySelector('.overlay-form')
  const anims = form ? form.getAnimations() : []
  console.log('[TD] anims=', anims.length, 'formDisplay=', form ? getComputedStyle(form).display : 'none')
  const done = anims.length ? Promise.all(anims.map(a => a.finished.catch(() => {}))) : Promise.resolve()
  done.then(() => {
    console.log('[TD] done.then enter, tourActive=', ui.tourActive, 'visible=', ui.linkForm.visible)
    if (!ui.tourActive) return
    reposition()
    const el = resolveTargetEl()
    console.log('[TD] repositioned, el=', el ? el.className : null, 'rect=', JSON.stringify(rect.value))
    if (el && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => reposition())
      ro.observe(el)
    }
  })
}

watch(() => ui.tourActive, v => {
  console.log('[TD] tourActive ->', v)
  if (!v) return
  stepIdx.value = 0
  measure()
})
watch(stepIdx, v => { console.log('[TD] stepIdx ->', v); measure() })
/* 同步「当前步骤是否允许右键空白进入链接页」到 ui：App.vue 的右键处理据此放行 / 屏蔽 */
watchEffect(() => {
  ui.tourRightClickEnter = ui.tourActive && !!(step.value && step.value.rightClickEnterLinks)
})

/* 右键菜单联动：菜单打开时挖洞扩展为「聚焦目标 ∪ 菜单」让菜单内容可见，气泡临时让路；关闭后恢复聚焦目标 */
const expanded = ref(null)
watch(() => [ui.ctxMenu.visible, ui.ctxMenu.x, ui.ctxMenu.y], async ([v]) => {
  if (!ui.tourActive || !v) { expanded.value = null; reposition(); return }
  await nextTick()
  await new Promise(r => setTimeout(r, 220))   // 等菜单 pop 动画稳定后测量
  const menu = document.querySelector('.context-menu')
  if (!menu || !rect.value) { expanded.value = null; return }
  const mr = menu.getBoundingClientRect()
  const t = rect.value
  const top = Math.min(t.top, mr.top - 10)
  const left = Math.min(t.left, mr.left - 10)
  const right = Math.max(t.left + t.width, mr.right + 10)
  const bottom = Math.max(t.top + t.height, mr.bottom + 10)
  expanded.value = { top, left, width: right - left, height: bottom - top }
})

/* 用户完成对应操作自动前进；动态目标步骤在状态切换时刷新挖洞定位 */
watchEffect(() => {
  if (!ui.tourActive) return
  const s = step.value
  const fd = document.querySelector('.overlay-form') ? getComputedStyle(document.querySelector('.overlay-form')).display : 'n/a'
  console.log('[TD] watchEffect run, idx=', stepIdx.value, 'title=', s.title, 'visible=', ui.linkForm.visible, 'formDisplay=', fd)
  if (s.expect && s.expect()) { console.log('[TD] expect -> nextStep'); nextStep(); return }
  if (typeof s.target === 'function') {
    s.target()   // 建立响应依赖：表单开/合等状态变化时本 effect 重跑
    console.log('[TD] schedule refreshDynamic')
    nextTick(() => { console.log('[TD] nextTick cb, step match=', step.value === s); if (ui.tourActive && step.value === s) refreshDynamic() })
  }
})

function nextStep() {
  console.log('[TD] nextStep', stepIdx.value)
  if (isLast.value) { ui.tourActive = false; return }
  stepIdx.value++
}
function skipTour() { ui.tourActive = false }

/* 窗口尺寸变化时重新定位（防抖） */
let resizeTimer = null
function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 150) }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (ro) ro.disconnect()
})

/* 气泡定位：统一用 top/left（无 transform / bottom），步骤间位置由 CSS transition 平滑移动 */
const bubbleStyle = computed(() => {
  const w = Math.min(360, window.innerWidth - 24)
  let left, top
  if (!rect.value) {
    left = (window.innerWidth - w) / 2
    top = (window.innerHeight - bubbleH.value) / 2
  } else {
    left = Math.max(12, Math.min(rect.value.left + rect.value.width / 2 - w / 2, window.innerWidth - w - 12))
    const fitsBelow = rect.value.top + rect.value.height + bubbleH.value + 42 < window.innerHeight
    top = fitsBelow ? rect.value.top + rect.value.height + 14 : Math.max(12, rect.value.top - bubbleH.value - 14)
  }
  return { left: left + 'px', top: top + 'px', width: w + 'px' }
})
const holeStyle = computed(() => {
  const r = expanded.value || rect.value
  return r
    ? { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' }
    : {}
})
</script>

<template>
  <div v-if="ui.tourActive" class="tour-mask">
    <transition name="tfade">
      <div v-if="rect" class="tour-hole" :class="{ dim: !ready }" :style="holeStyle"></div>
    </transition>
    <div ref="bubbleRef" class="tour-bubble" :class="{ dim: !ready || !!expanded || ui.linkForm.visible }" :style="bubbleStyle">
      <div class="tb-head">
        <span class="tb-step">{{ stepIdx + 1 }} / {{ STEPS.length }}</span>
        <button class="tb-skip" @click="skipTour">跳过引导</button>
      </div>
      <div class="tb-title">{{ step.title }}</div>
      <div class="tb-desc" v-html="hlText(step.desc)"></div>
      <div class="tb-actions">
        <button class="btn btn-primary" @click="nextStep">{{ isLast ? '完成' : '下一步' }}</button>
      </div>
    </div>
    <!-- 表单/菜单打开、气泡让路期间的页内操作提示 -->
    <div class="tour-hint" :class="{ show: hintText && ready }">{{ hintText }}</div>
  </div>
</template>

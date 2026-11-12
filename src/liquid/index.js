// ============================================================
// 液态玻璃：为搜索框 / 拓展坞挂上边缘折射（仅毛玻璃风格）
// 依赖：lens.js（liquidGlass）
// 副作用：MutationObserver 跟踪元素增删 + 风格切换
// 链接页整体大背景不走折射，由 styles/liquid.css 直接改 .bg 的材质滤镜
// ============================================================
import { liquidGlass } from './lens'

// 需要边缘折射的表面：搜索框 / 拓展坞 / 链接页整页玻璃层
const TARGETS = [
  // 搜索框：Lumno 默认材质（边宽 40px，边缘偏移 1.1 倍，衰减 2.6，色散 15%）
  { selector: '.search-bar', options: { rim: 40, edge: 1.1, power: 2.6, dispersion: 0.15 } },
  // 拓展坞：固定边宽 18px，避免 hover 长高时反复重建滤镜
  { selector: '.dock', options: { rim: 18, edge: 1.1, power: 2.6, dispersion: 0.15 } },
  // 设置下拉列表：小面板用整张位移图（fullMap），避免九宫格拼接的接缝竖线；
  // 边宽/偏移加大、衰减放慢、色散加强，让折射在小面板上也足够明显
  { selector: '.dropdown', options: { rim: 72, edge: 2.2, power: 1.3, dispersion: 0.35, fullMap: true } },
  // 整页玻璃：边缘折射带与色散适中（rim 由 110 降到 80，避免边带过大）
  { selector: '.links-glass', options: { rim: 80, edge: 1.15, power: 2.2, dispersion: 0.15 } },
]

const lenses = new Map()   // Element -> liquidGlass 返回的 api
let enabled = false        // 仅毛玻璃风格启用
let started = false
let rafId = 0
let observer = null
let styleObserver = null

const isGlassStyle = () => document.documentElement.dataset.style === 'glass'

function addSurface(el, options) {
  if (lenses.has(el)) return
  lenses.set(el, liquidGlass(el, options))
}

function removeSurface(el) {
  lenses.get(el)?.destroy()
  lenses.delete(el)
}

/* 全量对齐当前 DOM：新增注册、移除销毁 */
function reconcile() {
  rafId = 0
  if (!enabled) return
  const found = new Map()
  for (const { selector, options } of TARGETS) {
    for (const el of document.querySelectorAll(selector)) found.set(el, options)
  }
  for (const el of [...lenses.keys()]) {
    if (!found.has(el) || !el.isConnected) removeSurface(el)
  }
  for (const [el, options] of found) addSurface(el, options)
}

function schedule() {
  if (!rafId) rafId = requestAnimationFrame(reconcile)
}

/* 风格切换：Fluent / 无界下不启用，切回毛玻璃再挂载 */
function syncEnabled() {
  const next = isGlassStyle()
  if (next === enabled) return
  enabled = next
  if (enabled) {
    schedule()
    return
  }
  for (const el of [...lenses.keys()]) removeSurface(el)
}

export function initLiquidGlass() {
  if (started) return
  started = true
  enabled = isGlassStyle()
  if (enabled) schedule()
  observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  // 风格维度由 theme.js 写在 html[data-style]
  styleObserver = new MutationObserver(syncEnabled)
  styleObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] })
}

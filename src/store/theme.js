// ============================================================
// 主题：解析最终主题 / 风格维度 / 主题色派生（驱动 CSS 变量与 body/html 类）
// 依赖：state（state.js）
// 副作用（模块加载即注册）：系统深浅色监听 + 多个 watchEffect 写 dataset/CSS 变量
// ============================================================
import { ref, computed, watchEffect } from 'vue'
import { state } from './state'

/* ---------- 主题 / 位置预设：应用到 body/html（驱动全局 CSS 类） ---------- */
const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
/* 跟随系统：OS 深浅色切换需实时响应（响应式值驱动下方 watchEffect 重跑） */
const systemDark = ref(darkMq.matches)
const onSystemDarkChange = e => { systemDark.value = e.matches }
if (darkMq.addEventListener) darkMq.addEventListener('change', onSystemDarkChange)
else if (darkMq.addListener) darkMq.addListener(onSystemDarkChange)
/* 解析后的最终主题（CSS 与组件复用，纯响应式来源） */
export const resolvedTheme = computed(() => state.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : state.theme)
watchEffect(() => {
  document.documentElement.dataset.theme = resolvedTheme.value
})
/* 风格维度：glass（毛玻璃，默认）/ fluent（Fluent 2）/ borderless（无界），驱动 CSS [data-style] 覆盖块 */
watchEffect(() => {
  const s = state.style
  document.documentElement.dataset.style = (s === 'fluent' || s === 'borderless') ? s : 'glass'
})
/* 搜索框动画维度：none / sink（沉入）/ lift（浮升），驱动 CSS [data-search-anim] */
watchEffect(() => {
  document.documentElement.dataset.searchAnim = state.searchAnim || 'none'
})
/* 搜索栏：交换搜索引擎与图标位置，驱动 CSS 反向排列 */
watchEffect(() => {
  document.documentElement.dataset.searchSwap = state.searchSwap ? '1' : '0'
})

/* ---------- 主题色：单一主色 → 自动派生全套（按钮/文字/图标/hover 联动） ---------- */
function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) return [57, 197, 187]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const mixChannel = (a, b, p) => Math.round(a + (b - a) * p)
/* WCAG 相对亮度与对比度（AA 标准：普通文字 4.5:1，大号/图标 3:1） */
const relLum = ([r, g, b]) => {
  const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrastRatio = (hexA, hexB) => {
  const l1 = relLum(hexToRgb(hexA)), l2 = relLum(hexToRgb(hexB))
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}
/* 迭代压深(light)/提亮(dark)直到对比度 ≥4.5:1，返回首个达标色 */
function ensureContrast(hex, bgHex, toLight) {
  let cur = hex
  for (let p = 0.15; p <= 0.85; p += 0.1) {
    const [r, g, b] = hexToRgb(hex)
    cur = rgbToHex([mixChannel(r, toLight ? 255 : 0, p), mixChannel(g, toLight ? 255 : 0, p), mixChannel(b, toLight ? 255 : 0, p)])
    if (contrastRatio(cur, bgHex) >= 4.5) return cur
  }
  return cur
}
const ACCENT_KEYS = ['--accent', '--accent-rgb', '--accent-on', '--accent-icon-text', '--accent-text', '--accent-grad-a', '--accent-grad-b']
watchEffect(() => {
  const el = document.documentElement
  if (!state.accentColor) {
    /* 未自定义 → 移除内联变量，回落到 CSS 默认主题色 */
    ACCENT_KEYS.forEach(k => el.style.removeProperty(k))
    return
  }
  const [r, g, b] = hexToRgb(state.accentColor)
  /* 按钮/图标文字：在 #fff 与深色锚点里选对比度更高者 */
  const onColor = contrastRatio(state.accentColor, '#ffffff') >= contrastRatio(state.accentColor, '#04302e') ? '#ffffff' : '#04302e'
  /* 渐变暗端：主色压深 35% */
  const deep = rgbToHex([mixChannel(r, 0, .35), mixChannel(g, 0, .35), mixChannel(b, 0, .35)])
  const [dr, dg, db] = hexToRgb(deep)
  /* 前景强调文字：按主题压深/提亮，直到对玻璃背景对比度达标 */
  const text = resolvedTheme.value === 'dark'
    ? ensureContrast(state.accentColor, '#0a141a', true)
    : ensureContrast(state.accentColor, '#ffffff', false)
  el.style.setProperty('--accent', state.accentColor)
  el.style.setProperty('--accent-rgb', `${r},${g},${b}`)
  el.style.setProperty('--accent-on', onColor)
  el.style.setProperty('--accent-icon-text', onColor)
  el.style.setProperty('--accent-text', text)
  el.style.setProperty('--accent-grad-a', `rgba(${r},${g},${b},.92)`)
  el.style.setProperty('--accent-grad-b', `rgba(${dr},${dg},${db},.95)`)
})

/* 外观 body 类：磁贴名称显示模式 / 悬浮动效关闭 / 玻璃高光 / 壁纸暗角 */
watchEffect(() => {
  document.body.classList.toggle('vignette-on', !!state.wallpaperVignette)
})
watchEffect(() => {
  document.body.classList.toggle('tile-text-hover', state.tileText === 'hover')
  document.body.classList.toggle('tile-text-none', state.tileText === 'none')
  document.body.classList.toggle('no-tile-hover', state.tileHoverLift <= 0)
  /* glass-shine 高光仅毛玻璃风格生效；Fluent 下高光/玻璃投影由 [data-style] 覆盖统一处理 */
  document.body.classList.toggle('glass-shine', !!state.glassShine && state.style !== 'fluent' && state.style !== 'borderless')
})

// ============================================================
// 页面布局：时钟 / 搜索框 / 拓展坞各自独立坐标（自定义优先，否则按位置预设）
// 依赖：state（state.js）、save（persistence.js）
// 副作用（模块加载即注册）：watchEffect 写布局 CSS 变量 / clock-pos body 类
// ============================================================
import { watchEffect } from 'vue'
import { state } from './state'
import { save } from './persistence'

const LAYOUT_POS = {
  top:    { x: 50, y: 15 },
  mid:    { x: 50, y: 40 },
  bottom: { x: 50, y: 92 },
  left:   { x: 20, y: 20 },
  right:  { x: 80, y: 20 }
}
/* 解析各元素实际坐标（自定义优先，否则按位置预设），供布局编辑与 CSS 变量使用。
   同预设的多个元素自动垂直错开（时钟在上、拓展坞在下），保证任意主题下不重叠：
   - 顶部预设：从上往下依次排布；中部预设：以预设点对称排布；底部预设：从下往上依次排布
   - 错开 15vh（约 162px）大于时钟高度（约 150px），避免无界等主题下时钟更宽/更高时重叠 */
export function resolveLayout() {
  const ORDER = ['clock', 'search', 'dock']
  const STEP = 15   // 错开间距（vh）
  /* 统计各预设被选次数（仅未自定义的元素参与排布） */
  const count = {}
  ORDER.forEach(k => {
    const c = state.layoutCustom && state.layoutCustom[k]
    if (c && c.x != null) return
    const pos = state[k + 'Pos'] || 'mid'
    count[pos] = (count[pos] || 0) + 1
  })
  const idx = {}
  const resolve = (kind, defSize, defWidth) => {
    const c = state.layoutCustom && state.layoutCustom[kind]
    const pos = state[kind + 'Pos'] || 'mid'
    const p = LAYOUT_POS[pos] || LAYOUT_POS.mid
    if (c && c.x != null) return { x: c.x, y: c.y, size: c.size != null ? c.size : defSize, width: c.width != null ? c.width : defWidth }
    const i = idx[pos] || 0
    idx[pos] = i + 1
    const n = count[pos] || 1
    let y
    if (pos === 'bottom') y = p.y - (n - 1 - i) * STEP      // 底部：dock 贴底，依次向上
    else if (pos === 'top' || pos === 'left' || pos === 'right') y = p.y + i * STEP
    /* 顶部/左上/右上：上方空间小（y=9~20），clock 留在预设位、依次向下排，
       避免对称错开把时钟顶出屏幕 */
    else y = p.y + (i - (n - 1) / 2) * STEP                  // 中部：以预设点对称排布
    return { x: p.x, y: Math.min(92, Math.max(5, y)), size: defSize, width: defWidth }
  }
  return { clock: resolve('clock', 100, 400), search: resolve('search', 100, 400), dock: resolve('dock', 100, 400) }
}
/* 将布局坐标写入 CSS 变量（布局编辑器可调用刷新） */
export function applyLayoutVars() {
  const root = document.documentElement
  const { clock, search, dock } = resolveLayout()
  root.style.setProperty('--clock-x', clock.x + '%')
  root.style.setProperty('--clock-y', clock.y + '%')
  root.style.setProperty('--clock-scale', String(clock.size / 100))
  root.style.setProperty('--search-x', search.x + '%')
  root.style.setProperty('--search-y', search.y + '%')
  root.style.setProperty('--search-w', search.width + 'px')
  root.style.setProperty('--dock-x', dock.x + '%')
  root.style.setProperty('--dock-y', dock.y + '%')
}
watchEffect(applyLayoutVars)
/* 重置页面布局：清除自定义坐标并恢复默认居中预设（时钟顶 / 搜索框中 / 拓展坞底） */
export function resetPageLayout() {
  state.layoutCustom = null
  state.clockPos = 'top'
  state.searchPos = 'mid'
  state.dockPos = 'bottom'
  applyLayoutVars()
  save()
}
/* 时钟位置 body 类：驱动 CSS 定位差异（link 页显示时钟时同规则） */
watchEffect(() => {
  const pos = state.clockPos || 'top'
  const b = document.body
  ;['top', 'mid', 'bottom', 'left', 'right'].forEach(p => b.classList.toggle('clock-pos-' + p, p === pos))
})

// ============================================================
// 材质与质感微调：毛玻璃强度 / 卡片圆角 / 卡片密度 / 搜索框圆角 / 图标形状尺寸
//               搜索框 / 拓展坞透明度、悬浮总幅度、动画维度 dataset
// 依赖：state（state.js）。纯副作用模块（无导出，仅顶层注册 watchEffect）
// ============================================================
import { watchEffect } from 'vue'
import { state } from './state'

/* 磁贴入场动画：fade（整体淡入）/ drop（依次落位），驱动 CSS [data-tile-enter] */
watchEffect(() => {
  document.documentElement.dataset.tileEnter = state.tileEnter === 'drop' ? 'drop' : 'fade'
})
/* 文件夹展开动画：normal（缩放）/ flip（3D 翻转），驱动 CSS [data-folder-anim] */
watchEffect(() => {
  document.documentElement.dataset.folderAnim = state.folderAnim === 'flip' ? 'flip' : 'normal'
})

/* ---------- 布局微调：毛玻璃强度 / 卡片圆角 / 卡片密度 / 搜索框圆角 / 图标形状尺寸 ---------- */
const DENSITY = {
  /* 间距 / 磁贴宽 / 图标-文字间距 / 图标尺寸：宽松需整体放大，避免只拉宽卡片 */
  compact: { gap: '14px', w: '92px', gapIn: '8px', ico: '38px' },
  comfort: { gap: '26px', w: '106px', gapIn: '12px', ico: '46px' },
  spacious: { gap: '40px', w: '128px', gapIn: '18px', ico: '54px' }
}
/* 图标形状 → 圆角半径：circle 恒 50%，方形固定小圆角，半圆角为「两圆两方」对角异形（左上/右下圆角、右上/左下直角） */
const ICON_SHAPES = {
  square: '5px',
  rounded: 'calc(13px * var(--radius-scale,1))',
  squircle: '30% 5px 30% 5px',
  circle: '50%'
}
watchEffect(() => {
  const el = document.documentElement
  if (state.glassStrength == null) el.style.removeProperty('--glass-a')
  else el.style.setProperty('--glass-a', String(state.glassStrength))
  if (state.cardRadius == null) el.style.removeProperty('--radius-scale')
  else el.style.setProperty('--radius-scale', String(state.cardRadius / 19))
  if (state.searchRadius == null) el.style.removeProperty('--search-radius')
  else el.style.setProperty('--search-radius', state.searchRadius + 'px')
  /* 图标形状圆角 */
  el.style.setProperty('--ico-radius', ICON_SHAPES[state.iconShape] || ICON_SHAPES.rounded)
  const d = DENSITY[state.tileDensity] || DENSITY.comfort
  /* 图标尺寸：手动指定则覆盖密度的预设尺寸 */
  const ico = state.iconSize != null ? state.iconSize + 'px' : d.ico
  el.style.setProperty('--tile-gap', d.gap)
  el.style.setProperty('--tile-w', d.w)
  el.style.setProperty('--tile-gap-in', d.gapIn)
  el.style.setProperty('--tile-ico', ico)
  /* 磁贴高度 = 上下内边距(30) + 图标 + 图标-文字间距 + 标题行高(约16)，用于对齐“添加”磁贴 */
  el.style.setProperty('--tile-h', `calc(46px + ${ico} + ${d.gapIn})`)
  /* 悬浮上浮距离（0 关闭，负值向上）+ 图标光晕强度（映射到 0~0.6 透明度） */
  el.style.setProperty('--tile-hover-lift', (-state.tileHoverLift) + 'px')
  el.style.setProperty('--tile-glow', (state.iconGlow / 100 * 0.6).toFixed(2))
})

/* 搜索框 / 拓展坞透明度（注入到 html：--search-bg 等 token 定义在 [data-theme] 上） */
watchEffect(() => {
  document.documentElement.style.setProperty('--search-alpha', String(state.searchOpacity))
  document.documentElement.style.setProperty('--dock-alpha', String(state.dockOpacity))
  /* 拓展坞悬浮总幅度：容器浮起按比例分摊（见 .dock:hover），图标浮起取剩余部分 */
  document.documentElement.style.setProperty('--dock-hover-lift', (state.dockHoverLift || 0) + 'px')
})

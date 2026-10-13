// ============================================================
// 字体：Canvas 探测本机已装字体，过滤后写入 ui.fontList
// 依赖：state（state.js）、constants（constants.js）
// ============================================================
import { state, ui } from './state'
import { FALLBACK_FONTS, GENERIC_FONTS } from './constants'

/* 图标 / 符号 / 表情类字体名关键词：不含真正的数字字形，从时钟字体列表剔除 */
const ICON_FONT_KEYWORDS = [
  'webdings', 'wingdings', 'dingbat', 'marlett', 'mdl2', 'fluent',
  'emoji', 'symbol', 'glyph', 'ornament', 'pictograph', 'awesome',
  'entypo', 'typicons', 'dashicons', 'ionicons', 'octicon',
  'material icons', 'material symbols', 'line awesome', 'font awesome', 'bootstrap icon'
]
const isTextFont = name => {
  const n = String(name || '').toLowerCase()
  return !ICON_FONT_KEYWORDS.some(k => n.includes(k))
}
/* Canvas 探测：对比候选字体与通用回退字体的渲染宽度，判断是否真的已安装。
   无需任何权限，Chrome / Edge 均可用，从而能识别系统中已装的第三方字体。 */
let fontProbeCtx = null
function isInstalledFont(family) {
  if (!fontProbeCtx) fontProbeCtx = document.createElement('canvas').getContext('2d')
  const probe = 'mmmmmmmmmmlli'
  fontProbeCtx.font = '48px "' + family + '",monospace'
  const w1 = fontProbeCtx.measureText(probe).width
  fontProbeCtx.font = '48px monospace'
  const w0 = fontProbeCtx.measureText(probe).width
  return w1 !== w0
}
export async function loadFonts() {
  const list = []
  const seen = new Set()
  const push = f => { if (!seen.has(f)) { seen.add(f); list.push(f) } }
  let n = 0
  for (const f of FALLBACK_FONTS) {
    try {
      if (!isTextFont(f)) continue
      if (GENERIC_FONTS.includes(f) || isInstalledFont(f)) push(f)
    } catch (e) { /* ignore */ }
    // 分批让出主线程：避免首次打开时上百次 Canvas 测量阻塞首屏渲染
    if (++n % 24 === 0) await new Promise(r => setTimeout(r, 0))
  }
  GENERIC_FONTS.forEach(g => push(g))
  ui.fontList = list
}

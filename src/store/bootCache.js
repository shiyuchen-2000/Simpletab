// ============================================================
// 首帧缓存：把主题与壁纸缩略图同步写入 localStorage
// 供 public/boot.js 在 Vue 挂载前读取（IndexedDB 只能异步读，先把小图顶上）
// 纯 localStorage 读写：无 state / 无 DOM 依赖
// ============================================================

export const BOOT_KEY = 'simpletab_boot'
const MAX_THUMB_CHARS = 300 * 1024   // dataURL 上限约 300KB，96px 缩略图通常 1~3KB
const THUMB_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

function readRaw() {
  try {
    const s = localStorage.getItem(BOOT_KEY)
    if (!s) return null
    const o = JSON.parse(s)
    return o && typeof o === 'object' ? o : null
  } catch (e) { return null }
}
function writeRaw(o) {
  try { localStorage.setItem(BOOT_KEY, JSON.stringify(o)) } catch (e) { /* 隐私模式 / 配额异常忽略 */ }
}

/* 主题：只接受 dark / light（resolvedTheme 已是解析后的值） */
export function setBootTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') return
  const o = readRaw() || {}
  if (o.theme === theme) return
  o.theme = theme
  writeRaw(o)
}

/* 缩略图：dataURL 必须为合法图片且长度受控 */
export function setBootThumb(dataURL) {
  if (typeof dataURL !== 'string' || !THUMB_RE.test(dataURL) || dataURL.length > MAX_THUMB_CHARS) return
  const o = readRaw() || {}
  o.thumb = dataURL
  writeRaw(o)
}

export function hasBootThumb() {
  const o = readRaw()
  return !!(o && typeof o.thumb === 'string' && THUMB_RE.test(o.thumb))
}

export function clearBootThumb() {
  const o = readRaw()
  if (!o || o.thumb === undefined) return
  delete o.thumb
  writeRaw(o)
}

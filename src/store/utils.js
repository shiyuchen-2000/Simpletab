// ============================================================
// 工具函数（纯函数，无 state / 无 DOM 副作用）
// ============================================================

export const uid = () => Math.random().toString(36).slice(2, 9)
export const letterOf = title => String(title || '').trim().charAt(0).toUpperCase() || '?'
export function fontStack(f) {
  if (['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(f)) return f
  return '"' + f + '",system-ui,sans-serif'
}
export const normalizeUrl = v => {
  v = (v || '').trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v
  try {
    const u = new URL(v)
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null
    return u.href
  } catch (e) { return null }
}

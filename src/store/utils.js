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
/* 从网址生成兜底标题：优先保留用户原始输入里的中文域名（浏览器 URL 会把中文
   规范化为 Punycode，如 百度.com → xn--wxtr44c.com，直接取 hostname 会得到乱码）；
   纯 ASCII 时沿用原规则：取首段、连字符转空格、首字母大写 */
export function titleFromUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const host = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0].split(':')[0]
  const first = host.split('.')[0]
  if (first && /[^\x00-\x7f]/.test(first)) return first
  let h = ''
  try {
    h = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).hostname.replace(/^www\./, '')
  } catch (e) { return '' }
  return h.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================
// 网页标题：新增链接后读取目标网页的 <title>，自动填入标题
// 扩展环境依赖 manifest 的 http/https host_permissions 直连；
// 网站环境受 CORS 限制可能失败，调用方回退到域名标题
// 只读取前 64KB，4 秒超时，失败静默
// ============================================================

const MAX_BYTES = 64 * 1024
const TIMEOUT = 4000
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i

function cleanTitle(raw) {
  try {
    /* 用 DOMParser 解码 HTML 实体（&amp; 等）并去掉标签 */
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  } catch (e) {
    return String(raw || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  }
}

export async function fetchPageTitle(url, timeout = TIMEOUT) {
  if (!/^https?:\/\//i.test(url || '')) return ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', redirect: 'follow' })
    if (!res.ok || !res.body) return ''
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let html = '', size = 0
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      html += dec.decode(value, { stream: true })
      const m = html.match(TITLE_RE)
      if (m) {
        reader.cancel().catch(() => {})
        return cleanTitle(m[1]).slice(0, 80)
      }
    }
    const m = html.match(TITLE_RE)
    return m ? cleanTitle(m[1]).slice(0, 80) : ''
  } catch (e) {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

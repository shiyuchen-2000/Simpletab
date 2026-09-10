// Cloudflare Pages Function：favicon 图标代理（服务端转发，绕过浏览器 CORS）
// 路由 /favicon/:host —— 网站环境下 faviconCache.js 的 /favicon/ 前缀请求命中
// 主源 Google s2（64px，清晰），失败换 DuckDuckGo 兜底（与扩展端多源策略呼应）
// 返回带 CDN 缓存头，favicon 可被边缘缓存，进一步节省请求

const SOURCE = host => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
const FALLBACK = host => `https://icons.duckduckgo.com/ip3/${host}.ico`

export async function onRequestGet({ params }) {
  const host = String(params.host || '').trim()
  // 防路径注入：host 只允许域名（无 / ? # 等）
  if (!host || /[\/?#]/.test(host)) {
    return new Response('Bad request', { status: 400 })
  }
  for (const url of [SOURCE(host), FALLBACK(host)]) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) continue
      const type = res.headers.get('content-type') || ''
      if (!type.startsWith('image/')) continue
      const body = await res.arrayBuffer()
      return new Response(body, {
        headers: {
          'content-type': type,
          'cache-control': 'public, max-age=86400'   // 边缘缓存 24h
        }
      })
    } catch (e) { /* 该源失败，尝试下一个 */ }
  }
  return new Response('Not found', { status: 404 })
}

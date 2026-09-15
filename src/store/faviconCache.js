// ============================================================
// favicon 本地缓存：拉取远程图标 → base64 dataURL 存本地
// 扩展环境：chrome.storage.local（独立 key，不进 sync 云备份）；
// 网站环境（无 chrome）：经 Cloudflare Pages 代理 /favicon/:host 转发图标（绕过 CORS），缓存于 localStorage
// 每次打开直接读本地缓存，零网络请求，图标秒开不再闪
// ============================================================
import { ref } from 'vue'

const CACHE_KEY = 'favicon_cache'      // chrome.storage.local 独立键
const CACHE_VER_KEY = 'favicon_cache_ver'
const CACHE_VERSION = '4'              // 源方案版本：源调整（favicon.im 置首高清源）后旧缓存需清除重拉
const TTL = 7 * 24 * 3600 * 1000       // 7 天过期；过期后旧图先用、后台刷新（stale-while-revalidate）
const MAX_ENTRIES = 500                // 条数上限（与壁纸共用 10MB 配额，需封顶）
const MAX_BYTES = 1.5 * 1024 * 1024    // 总量上限约 1.5MB（单条平均 ~3KB）
const MAX_SINGLE = 120 * 1024          // 单条上限 120KB，拒绝异常大图
const FETCH_TIMEOUT = 3000             // 每源超时 3s，超时换下一个源
const SAVE_DEBOUNCE = 500              // 批量落盘防抖

// 多源策略：按顺序逐个尝试。国内无代理环境可用源前置（favicon.im/google-cn/yandex），
// 各源域名已同步在 manifest host_permissions 授权。
// favicon.im：质量最高（SVG 矢量可无限缩放 / 大尺寸 PNG/ICO，如 bilibili 512px）；
//   未收录站点返回灰色圆首字母占位 SVG（与本地字母图标类似，可接受）。
// google-cn：Google faviconV2 经国内可达的 gstatic.cn CDN（32-64px，size 参数不保证更大）；
//   未收录站点返回 HTTP 404，被 res.ok 检查拒绝，不污染缓存。
// 注意：bing 的 favicon 服务对所有站点返回固定 Bing 品牌图标，不可作为源；
// yandex 对未收录站点返回 1x1 透明图，会被 validImage 尺寸校验拒绝并自动换源。
export const FAVICON_SOURCES = [
  { name: 'favicon.im', url: h => `https://favicon.im/${h}` },
  { name: 'google-cn',  url: h => `https://t1.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent('https://' + h)}&size=64` },
  { name: 'yandex',     url: h => `https://favicon.yandex.net/favicon/${h}` },
  { name: 'google',     url: h => `https://www.google.com/s2/favicons?domain=${h}&sz=64` },
  { name: 'duckduckgo', url: h => `https://icons.duckduckgo.com/ip3/${h}.ico` }
]
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local
/* 扩展环境（有 chrome.storage）：直连远程，manifest host_permissions 已授权跨域；
   网站环境（无 chrome）：走 Cloudflare Pages 代理 /favicon/:host（同源请求，无 CORS 限制） */
const isExtension = hasChromeStorage
const PROXY_BASE = '/favicon/'
/* 抓取源：扩展按三源逐个尝试；网站仅代理路径（Cloudflare 服务端转发 google s2，保留 64px 清晰度） */
const fetchSources = h => isExtension
  ? FAVICON_SOURCES.map(s => s.url(h))
  : [PROXY_BASE + h]

const cache = ref({})        // host -> { data: dataURL, t: 时间戳 }，Vue 响应式，组件直接读
const inflight = new Map()   // host -> Promise，同页内并发去重
let loaded = false
let saveTimer = null

/* ---------- 工具 ---------- */
export function hostOf(url) {
  try { return new URL(url).hostname } catch (e) { return '' }
}
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

/* ---------- 缓存淘汰 ---------- */
function trimCache() {
  const entries = Object.entries(cache.value)
  let total = 0
  for (const [, v] of entries) total += v.data.length
  if (entries.length <= MAX_ENTRIES && total <= MAX_BYTES) return
  const list = entries.slice().sort((a, b) => a[1].t - b[1].t)  // 最老优先淘汰
  while (Object.keys(cache.value).length > MAX_ENTRIES || total > MAX_BYTES) {
    const [host, v] = list.shift()
    if (!host) break
    delete cache.value[host]
    total -= v.data.length
  }
}
function evictHalf() {
  const list = Object.entries(cache.value).sort((a, b) => a[1].t - b[1].t)
  list.slice(0, Math.ceil(list.length / 2)).forEach(([h]) => { delete cache.value[h] })
}
function setCache(host, dataURL) {
  cache.value[host] = { data: dataURL, t: Date.now() }
  trimCache()
  scheduleSave()
}

/* ---------- 持久化 ---------- */
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persistFaviconCache, SAVE_DEBOUNCE)
}
export async function persistFaviconCache() {
  // 先转成普通对象：Vue 的 reactive Proxy 无法被 structured-clone / 序列化直接处理
  const plain = JSON.parse(JSON.stringify(cache.value))
  if (isExtension) {
    try {
      await chrome.storage.local.set({ [CACHE_KEY]: plain })
    } catch (e) {
      // 配额不足：丢最老一半重试一次，仍失败则放弃（下次打开自动重新拉取）
      evictHalf()
      try { await chrome.storage.local.set({ [CACHE_KEY]: JSON.parse(JSON.stringify(cache.value)) }) } catch (err) { /* ignore */ }
    }
  } else {
    // 网站：localStorage 持久化（1.5MB 上限远低于 5MB 配额）
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(plain)) } catch (e) { /* 隐私模式/配额异常忽略 */ }
  }
}
export async function loadFaviconCache() {
  if (loaded) return
  loaded = true
  let map = null
  let ver = null
  try {
    if (isExtension) {
      const res = await chrome.storage.local.get([CACHE_KEY, CACHE_VER_KEY])
      map = res[CACHE_KEY]
      ver = res[CACHE_VER_KEY]
    } else {
      const s = localStorage.getItem(CACHE_KEY)
      if (s) map = JSON.parse(s)
      ver = localStorage.getItem(CACHE_VER_KEY)
    }
  } catch (e) { map = null }
  /* 缓存版本迁移：源方案变更后旧缓存可能混入品牌默认图标（如 bing logo），
     版本不匹配时清空缓存重新拉取，避免错误图标继续显示 */
  if (ver !== CACHE_VERSION) {
    cache.value = {}
    map = null
    try {
      if (isExtension) await chrome.storage.local.set({ [CACHE_VER_KEY]: CACHE_VERSION })
      else localStorage.setItem(CACHE_VER_KEY, CACHE_VERSION)
    } catch (e) { /* ignore */ }
  }
  try {
    if (map && typeof map === 'object') {
      for (const [host, v] of Object.entries(map)) {
        // 只接受合法结构，防脏数据
        if (v && typeof v.data === 'string' && v.data.startsWith('data:image/')) {
          cache.value[host] = { data: v.data, t: v.t || 0 }
        }
      }
      trimCache()
    }
  } catch (e) { /* 读取失败按无缓存处理 */ }
}

/* ---------- 拉取 ---------- */
async function fetchAsDataURL(url, timeout) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null   // 只接受图片，防 HTML 等非图片响应
    return await blobToDataURL(blob)
  } finally {
    clearTimeout(timer)
  }
}
/* 解码校验：图片必须可解码且宽高均 >= 2px（1xN / Nx1 之类的坏图拉伸后渲染成线条） */
function validImage(dataURL) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth >= 2 && img.naturalHeight >= 2)
    img.onerror = () => resolve(false)
    img.src = dataURL
  })
}

async function fetchFavicon(host) {
  // 扩展：三源直连逐个尝试；网站：仅 Cloudflare 代理路径（同源请求）
  for (const url of fetchSources(host)) {
    try {
      const dataURL = await fetchAsDataURL(url, FETCH_TIMEOUT)
      if (!dataURL || dataURL.length > MAX_SINGLE) continue
      // 尺寸校验：1xN 追踪像素类坏图 cover 拉伸后会显示成横/竖条，拒之门外
      if (!(await validImage(dataURL))) continue
      setCache(host, dataURL)
      return dataURL
    } catch (e) { /* 该源失败，尝试下一个 */ }
  }
  return null   // 全源失败：不写缓存，下次打开再试，避免把坏结果永久锁死
}

/* ---------- 对外 API ---------- */
/* 同步、缓存优先：命中返回本地 dataURL（过期则顺手后台刷新，旧图先顶着）；
   未命中返回远程 URL 兜底，<img> 直连保证一定能显示，并顺手触发后台拉缓存 */
export function faviconSrc(url) {
  const host = hostOf(url)
  if (!host) return ''
  const hit = cache.value[host]
  if (hit) {
    if (Date.now() - hit.t > TTL) ensureFavicon(host)
    return hit.data
  }
  /* 未命中：不返回远程兜底 URL——部分源（如 bing）对未知站点返回品牌默认图标会污染显示。
     返回 '' 让磁贴先显示首字母，后台拉取真实 favicon 成功后缓存更新、组件自动切换 */
  ensureFavicon(host)
  return ''
}
/* 异步拉取，带并发去重；新鲜缓存直接返回 */
export function ensureFavicon(host) {
  if (!host) return Promise.resolve('')
  const hit = cache.value[host]
  if (hit && Date.now() - hit.t <= TTL) return Promise.resolve(hit.data)
  if (inflight.has(host)) return inflight.get(host)
  const p = fetchFavicon(host)
  inflight.set(host, p)
  return p.finally(() => inflight.delete(host))
}
/* 启动 / 新增链接后批量预热：跳过文字图标 */
export function warmFaviconCache(links) {
  const hosts = new Set()
  for (const l of links || []) {
    if (l && l.iconMode === 'text') continue
    const h = hostOf(l && l.url)
    if (h) hosts.add(h)
  }
  for (const h of hosts) ensureFavicon(h)
}

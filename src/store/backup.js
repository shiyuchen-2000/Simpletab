// ============================================================
// 数据管理：导出 / 导入配置 + 云端手动推拉
// 导出不含壁纸（壁纸走 IndexedDB，本设备独立）；导入为整体覆盖
// ============================================================
import { state, save, readSyncState, normalizeUrl, uid, DEFAULT_ENGINES } from './index'

const APP_TAG = 'SimpleTab'

/* 校验导入数据，合法返回 ''，否则返回错误文案 */
function validate(data) {
  if (!data || typeof data !== 'object' || data.app !== APP_TAG) return '不是有效的 SimpleTab 配置文件'
  const s = data.data && data.data.state
  if (!s || typeof s !== 'object' || !Array.isArray(s.links) || !Array.isArray(s.folders)) return '配置内容不完整，请检查文件'
  return ''
}

/* 导出当前配置为 JSON 文件下载（不含壁纸；view 为临时 UI 状态，不导出） */
export function exportConfig() {
  const snapshot = JSON.parse(JSON.stringify(state))
  delete snapshot.wallpaper
  delete snapshot.wallpaperType
  delete snapshot.view
  const payload = { app: APP_TAG, data: { state: snapshot } }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'simpletab-config.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* 分项应用导入数据：opts.settings 覆盖设置字段，opts.links 替换链接与文件夹布局。
   设置字段按导入文件里实际存在的覆盖（旧版本文件缺字段时保留当前）；links 与 folders 必须成对替换
   （folderId 引用文件夹），因此合并为同一选项。壁纸 / view 永不参与导入。
   成功返回 null，否则返回错误文案 */
const SKIP_KEYS = ['links', 'folders', 'wallpaper', 'wallpaperType', 'view', '__proto__', 'constructor', 'prototype']

/* 链接条目清洗：必须为对象且含字符串 title/url，url 必须能通过 normalizeUrl 协议校验（http/https），
   否则整条丢弃——防止导入配置注入 javascript: 等危险协议（H1）或畸形条目导致渲染崩溃（H2） */
const sanitizeLink = l => {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return null
  if (typeof l.title !== 'string' || typeof l.url !== 'string') return null
  const url = normalizeUrl(l.url)
  if (!url) return null
  return { ...l, title: l.title, url }
}
/* 文件夹条目清洗：必须为对象且含字符串 id，title 缺失补默认名 */
const sanitizeFolder = f => {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return null
  if (typeof f.id !== 'string') return null
  return { ...f, title: typeof f.title === 'string' ? f.title : '未命名文件夹' }
}
/* 搜索引擎清洗：url 必须 http/https 且含 {q} 占位符，否则丢弃 */
const sanitizeEngine = e => {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null
  if (typeof e.name !== 'string' || typeof e.url !== 'string') return null
  if (!/^https?:\/\//i.test(e.url) || !e.url.includes('{q}')) return null
  return { key: typeof e.key === 'string' ? e.key : uid(), name: e.name, url: e.url }
}

export function applyImport(data, opts = { settings: true, links: true }) {
  const err = validate(data)
  if (err) return err
  if (!opts.settings && !opts.links) return '请至少选择一项导入内容'
  const s = data.data.state
  if (opts.settings) {
    for (const k of Object.keys(s)) {
      if (SKIP_KEYS.includes(k)) continue
      /* 搜索引擎单独清洗：url 协议白名单 + {q} 校验，防止注入恶意搜索跳转（H1） */
      if (k === 'engines' && Array.isArray(s[k])) {
        const cleaned = s[k].map(sanitizeEngine).filter(Boolean)
        state.engines = cleaned.length ? cleaned : DEFAULT_ENGINES
        continue
      }
      state[k] = s[k]
    }
    /* 导入的当前引擎键必须存在于清洗后的 engines，否则回落第一个 */
    if (typeof s.engine === 'string' && !state.engines.some(e => e.key === s.engine)) {
      state.engine = state.engines[0]?.key || ''
    }
  }
  if (opts.links) {
    state.links = (Array.isArray(s.links) ? s.links.map(sanitizeLink) : []).filter(Boolean)
    state.folders = (Array.isArray(s.folders) ? s.folders.map(sanitizeFolder) : []).filter(Boolean)
  }
  save()
  return null
}

/* 从云端备份读取配置，整理为与导出文件相同的结构；无备份返回 null。
   复用 readSyncState 完整读取（base 设置+文件夹 + 链接分块 startpage_links_*），
   否则 state 缺 links 数组，validate 会误判「配置内容不完整」 */
export async function loadFromSync() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return null
  let data = null
  try { data = await readSyncState() } catch (e) { /* 读取失败按无备份处理 */ }
  if (!data) return null
  return { app: APP_TAG, data: { state: data } }
}

// ============================================================
// 链接增删改：新增 / 编辑表单（锚点展开）/ 关闭 / 保存 / 批量新增 / 移出文件夹 / 打开链接
// 注意：deleteLink（确认删除入口）在 interactions.js，避免反向依赖交互层
// 依赖：state/ui/toast（state.js）、save（persistence.js）、pruneEmptyFolders（folders.js）、
//       ensureFavicon/hostOf（faviconCache.js）、uid/normalizeUrl（utils.js）
// ============================================================
import { nextTick } from 'vue'
import { state, ui, toast } from './state'
import { save } from './persistence'
import { pruneEmptyFolders } from './folders'
import { ensureFavicon, hostOf } from './faviconCache'
import { uid, normalizeUrl } from './utils'

/* ---------- 链接增删改 ---------- */
export function openAddForm(anchorEl, folderId) {
  /* 实时预览模式：禁止打开添加/编辑表单 */
  if (ui.preview) { toast('预览模式下不可添加链接'); return }
  ui.linkForm.closing = false   // 打开时重置关闭动画状态，避免残留 closing 类
  ui.linkForm.mode = 'add'
  ui.linkForm.id = null
  ui.linkForm.url = ''
  ui.linkForm.name = ''
  ui.linkForm.batch = false
  ui.linkForm.batchText = ''
  ui.linkForm.folderSel = folderId || ''
  ui.linkForm.newFolder = ''
  ui.linkForm.err = ''
  showForm(anchorEl)
}
/* 展示表单：若已打开（编辑 ⇄ 新增切换）先隐藏再显示，重播打开动画 */
function showForm(anchorEl) {
  if (ui.linkForm.visible) {
    ui.linkForm.visible = false
    nextTick(() => { ui.linkForm.visible = true; positionForm(anchorEl) })
  } else {
    ui.linkForm.visible = true
    nextTick(() => positionForm(anchorEl))
  }
}
export function openEditForm(anchorEl, id) {
  const l = state.links.find(x => x.id === id)
  if (!l) return
  ui.linkForm.closing = false   // 打开时重置关闭动画状态
  ui.linkForm.mode = 'edit'
  ui.linkForm.id = id
  ui.linkForm.url = l.url
  ui.linkForm.name = l.title
  ui.linkForm.folderSel = l.folderId || ''
  ui.linkForm.newFolder = ''
  ui.linkForm.err = ''
  showForm(anchorEl)
}
function positionForm(anchorEl) {
  if (!anchorEl) return
  const r = anchorEl.getBoundingClientRect()
  const formEl = document.querySelector('.overlay-form')
  // 测量真实高度（未渲染时用估算兜底）
  const fh = formEl ? formEl.offsetHeight : 360
  const margin = 14
  // 优先放磁贴上方；上方放不下则放下方；都放不下就贴顶并允许滚动
  let top = r.top - fh - margin
  if (top < margin) {
    top = r.bottom + margin
    if (top + fh > window.innerHeight - margin) top = margin
  }
  ui.linkForm.top = top
  const fw = formEl ? formEl.offsetWidth : 340
  // 水平居中且不越出视口：极窄窗口下 clamp 到 [0, vw-fw]，避免负坐标出屏
  const maxLeft = Math.max(margin, window.innerWidth - fw - margin)
  ui.linkForm.left = Math.max(0, Math.min(Math.max(margin, r.left + r.width / 2 - fw / 2), maxLeft))
  /* 展开锚点：transform-origin 指向触发磁贴中心，打开动画从磁贴位置展开、关闭收回磁贴 */
  ui.linkForm.origin = `${Math.round(r.left + r.width / 2 - ui.linkForm.left)}px ${Math.round(r.top + r.height / 2 - top)}px`
}
/* 关闭新增/编辑表单：先播退出动画（closing），动画结束再真正隐藏 */
export function closeForm() {
  if (!ui.linkForm.visible || ui.linkForm.closing) return
  ui.linkForm.closing = true
  setTimeout(() => { ui.linkForm.visible = false; ui.linkForm.closing = false }, 190)
}
export function saveForm() {
  const url = normalizeUrl(ui.linkForm.url)
  if (!url) { ui.linkForm.err = '网址无效，请检查后重试'; return }
  const title = ui.linkForm.name.trim() || new URL(url).hostname.replace(/^www\./, '')
  let folderId = null
  const fv = ui.linkForm.folderSel
  if (fv === '__new') {
    const name = ui.linkForm.newFolder.trim() || '新文件夹'
    const nf = { id: uid(), title: name }
    state.folders.push(nf)
    folderId = nf.id
  } else if (fv) folderId = fv
  else folderId = null
  if (ui.linkForm.mode === 'add') {
    state.links.push({ id: uid(), title, url, folderId, inDock: false, iconMode: 'auto' })
    toast('已添加 ' + title)
    ensureFavicon(hostOf(url))   // 新链接图标即时预热，不必等下次开新标签页
  } else {
    const l = state.links.find(x => x.id === ui.linkForm.id)
    if (l) {
      const oldFid = l.folderId
      l.url = url; l.title = title; l.folderId = folderId
      if (oldFid && oldFid !== folderId) pruneEmptyFolders()
      toast('已保存修改')
      ensureFavicon(hostOf(url))   // 编辑换网址后刷新图标缓存
    }
  }
  ui.linkForm.visible = false
  save()
}

/* ---------- 批量新增：多行解析 → 去重 → 一次写入 ---------- */
const looksLikeUrl = v => /^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+/.test(v)
// 纯网址时的标题兜底：取主域名首段，去掉连字符、首字母大写（与单条表单一致）
const titleFromHost = h => h.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
export function saveBatchForm() {
  const existing = new Set(state.links.map(l => normalizeUrl(l.url)))
  const batch = []
  let skipped = 0
  for (const raw of (ui.linkForm.batchText || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    // 每行：名称,网址 或 网址,名称（兼容全角逗号）；无逗号则整行为网址
    const sep = line.search(/[,，]/)
    let name = '', url = line
    if (sep > -1) {
      const left = line.slice(0, sep).trim()
      const right = line.slice(sep + 1).trim()
      if (looksLikeUrl(left) && !looksLikeUrl(right)) { url = left; name = right }
      else { name = left; url = right }
    }
    const u = normalizeUrl(url)
    if (!u || existing.has(u)) { skipped++; continue }
    existing.add(u)
    const title = name.trim() || titleFromHost(new URL(u).hostname)
    batch.push({ id: uid(), title, url: u, folderId: null, inDock: false, iconMode: 'auto' })
  }
  if (!batch.length) {
    ui.linkForm.err = skipped ? '没有可添加的链接：全部重复或格式无效' : '请粘贴至少一个网址'
    return
  }
  // 文件夹（含新建）只创建一次
  let folderId = null
  const fv = ui.linkForm.folderSel
  if (fv === '__new') {
    const nf = { id: uid(), title: ui.linkForm.newFolder.trim() || '新文件夹' }
    state.folders.push(nf)
    folderId = nf.id
  } else if (fv) folderId = fv
  batch.forEach(l => { l.folderId = folderId })
  state.links.push(...batch)
  batch.forEach(l => ensureFavicon(hostOf(l.url)))   // 统一预热图标
  toast('已添加 ' + batch.length + ' 个链接' + (skipped ? '，跳过 ' + skipped + ' 个' : ''))
  ui.linkForm.visible = false
  save()
}

/* ---------- 链接操作 ---------- */
export function moveOutFolder(id) {
  const l = state.links.find(x => x.id === id)
  if (l) {
    const fid = l.folderId
    l.folderId = null
    if (fid) pruneEmptyFolders()
    save(); toast('已移出文件夹')
  }
}
/* 打开链接：按设置决定新标签页 / 当前页。
   协议白名单：链接 url 可能来自导入/同步的不可信数据，拒绝非 http/https（H1） */
export function openLinkUrl(url) {
  if (!/^https?:\/\//i.test(url)) return
  /* 实时预览模式：禁止访问链接，仅提示 */
  if (ui.preview) { toast('预览模式下不可打开链接'); return }
  window.open(url, state.linkOpenIn === 'self' ? '_self' : '_blank')
}

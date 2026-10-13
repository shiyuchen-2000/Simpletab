// ============================================================
// 持久化封装：chrome.storage.local 优先，sync 云端备份，回退 localStorage
// 依赖：state / toast（state.js）、wallpaperDB（壁纸索引）
// 副作用（模块加载即注册）：pagehide / visibilitychange 时 flush 防抖落盘
// ============================================================
import { ref } from 'vue'
import { state, toast } from './state'
import { loadWallpaperBlob, saveWallpaperBlob, kindOfBlob } from './wallpaperDB'

const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local
export const hasSyncStorage = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync
/* 云端备份分块：chrome.storage.sync 单条目上限 8KB、总量 100KB，链接多会超单条目写失败，
   故设置+文件夹一个 key、链接按字节分块存多个 key，容量撑到约 700 链接 */
const SYNC_BASE_KEY = 'startpage_state'
const SYNC_LINKS_PREFIX = 'startpage_links_'
const SYNC_BLOCK_BYTES = 6 * 1024   // 每块 <6KB，留余量防 8KB 单条目超限
/* 同步用量（字节，响应式），设置里显示 已用 / 100KB */
export const syncUsage = ref(0)
export async function refreshSyncUsage() {
  if (!hasSyncStorage) { syncUsage.value = 0; return }
  try { syncUsage.value = await chrome.storage.sync.getBytesInUse(null) } catch (e) { syncUsage.value = 0 }
}
/* 链接按字节分块，避免单块超 8KB */
function chunkLinks(links) {
  const blocks = []
  let cur = [], size = 0
  for (const l of links) {
    const s = JSON.stringify(l).length
    if (cur.length && size + s > SYNC_BLOCK_BYTES) { blocks.push(cur); cur = []; size = 0 }
    cur.push(l); size += s
  }
  if (cur.length) blocks.push(cur)
  return blocks
}
/* 从 sync 读取完整状态：base（设置+文件夹）+ 链接分块；兼容旧版单 key 内直接含 links 的格式 */
export async function readSyncState() {
  const got = await chrome.storage.sync.get(null)
  const base = got[SYNC_BASE_KEY]
  if (!base) return null
  if (Array.isArray(base.links)) return base   // 旧格式
  const links = []
  const keys = Object.keys(got)
    .filter(k => k.startsWith(SYNC_LINKS_PREFIX))
    .sort((a, b) => parseInt(a.slice(SYNC_LINKS_PREFIX.length), 10) - parseInt(b.slice(SYNC_LINKS_PREFIX.length), 10))
  for (const k of keys) links.push(...(got[k] || []))
  return { ...base, links }
}
export async function loadState() {
  let saved = null
  if (hasChromeStorage) {
    try {
      const data = await chrome.storage.local.get('startpage_state')
      if (data && data.startpage_state) saved = data.startpage_state
    } catch (e) { /* ignore */ }
  }
  // local 为空（如 Edge 清缓存清了扩展存储）→ 从 sync 云端备份恢复
  let fromSync = false
  if (!saved && hasSyncStorage) {
    try {
      saved = await readSyncState()
      if (saved) fromSync = true
    } catch (e) { /* ignore */ }
  }
  if (!saved) {
    try {
      const s = localStorage.getItem('startpage_state')
      if (s) saved = JSON.parse(s)
    } catch (e) { /* ignore */ }
  }
  /* 壁纸：IndexedDB（新方案）优先；storage 里残留旧 base64 则迁移到 IDB，本轮保留显示。
     无论哪种情况都从 saved 剥离壁纸，避免 applySaved 用旧值覆盖 objectURL */
  try {
    const blob = await loadWallpaperBlob()
    if (blob) {
      state.wallpaper = URL.createObjectURL(blob)
      state.wallpaperType = kindOfBlob(blob)
    } else if (saved && typeof saved.wallpaper === 'string' && saved.wallpaper.startsWith('data:image')) {
      state.wallpaper = saved.wallpaper
      state.wallpaperType = 'image'
      migrateLegacyWallpaper(saved.wallpaper)
    }
  } catch (e) { /* IDB 不可用不阻塞启动，壁纸显示默认 */ }
  if (saved) { delete saved.wallpaper; delete saved.wallpaperType }
  /* 首次从云端恢复且本机无壁纸：轻提示，避免"壁纸怎么没了"的困惑 */
  if (fromSync) {
    try {
      if (!(await loadWallpaperBlob())) toast('设置已同步，壁纸需在本机重新选择')
    } catch (e) { /* ignore */ }
  }
  return saved
}
/* 旧版壁纸以 base64 存于 storage，升级后一次性迁移到 IndexedDB（原始 Blob）。
   storage 里的旧 base64 在下次 save() 落盘时随剥离自然清除 */
async function migrateLegacyWallpaper(dataUrl) {
  try {
    if (await loadWallpaperBlob()) return   // 已有新壁纸，不覆盖
    const blob = await fetch(dataUrl).then(r => r.blob())
    if (!blob || !blob.type.startsWith('image/')) return
    await saveWallpaperBlob(blob)
  } catch (e) { /* 迁移失败不影响使用，旧图本轮照常显示 */ }
}
export async function persistState(state) {
  // 壁纸已独立存于 IndexedDB，不再进 storage：消除 base64 膨胀与每次保存的全量序列化。
  // 仅写本地（local / localStorage 兜底）。云端快照由手动「立即同步」pushToCloud 写入——
  // 否则每次改动自动同步会让云端恒等于当前状态，「从云端恢复」永远看不到变化。
  const { wallpaper, wallpaperType, ...rest } = state
  const { links = [], folders = [], ...settings } = rest
  const settingsObj = JSON.parse(JSON.stringify(settings))
  const foldersObj = JSON.parse(JSON.stringify(folders))
  const linksArr = JSON.parse(JSON.stringify(links))
  // 本地：完整数据（设置+文件夹+链接，local 配额大、无单条目限制）；localStorage 仅兜底
  const localObj = { ...settingsObj, folders: foldersObj, links: linksArr }
  if (hasChromeStorage) {
    try { await chrome.storage.local.set({ startpage_state: localObj }) }
    catch (e) { try { localStorage.setItem('startpage_state', JSON.stringify(localObj)) } catch (err) { /* ignore */ } }
  } else {
    try { localStorage.setItem('startpage_state', JSON.stringify(localObj)) } catch (e) { /* ignore */ }
  }
}

/* 手动推送到云端快照（设置+文件夹一个 key，链接分块，突破 8KB 单条目限制）。
   仅由「立即同步」调用：把当前状态保存为云端快照，「从云端恢复」可回到该快照。返回是否成功 */
export async function pushToCloud() {
  if (!hasSyncStorage) return false
  const { wallpaper, wallpaperType, ...rest } = state
  const { links = [], folders = [], ...settings } = rest
  const settingsObj = JSON.parse(JSON.stringify(settings))
  const foldersObj = JSON.parse(JSON.stringify(folders))
  const linksArr = JSON.parse(JSON.stringify(links))
  try {
    await chrome.storage.sync.set({ [SYNC_BASE_KEY]: { ...settingsObj, folders: foldersObj } })
    const all = await chrome.storage.sync.get(null)
    const oldKeys = Object.keys(all).filter(k => k.startsWith(SYNC_LINKS_PREFIX))
    if (oldKeys.length) await chrome.storage.sync.remove(oldKeys)
    const blocks = chunkLinks(linksArr)
    for (let i = 0; i < blocks.length; i++) {
      await chrome.storage.sync.set({ [SYNC_LINKS_PREFIX + i]: blocks[i] })
    }
    refreshSyncUsage()
    return true
  } catch (e) {
    toast('云备份已达上限，部分数据仅本机保存', 'err')
    return false
  }
}
/* 将已读取的数据合并进响应式 state（缺失字段回落到当前默认） */
export function applySaved(saved) {
  Object.assign(state, {
    theme: saved.theme ?? state.theme,
    style: saved.style ?? state.style,
    hour12: saved.hour12 ?? state.hour12,
    showSeconds: saved.showSeconds ?? state.showSeconds,
    blink: saved.blink ?? state.blink,
    clockFont: saved.clockFont ?? state.clockFont,
    clockColor: saved.clockColor ?? state.clockColor,
    clockPos: saved.clockPos ?? state.clockPos, searchPos: saved.searchPos ?? state.searchPos, dockPos: saved.dockPos ?? state.dockPos, layoutCustom: saved.layoutCustom ?? state.layoutCustom,
    wallpaperFolderMode: saved.wallpaperFolderMode ?? state.wallpaperFolderMode,
    wallpaperFolderInterval: saved.wallpaperFolderInterval ?? state.wallpaperFolderInterval,
    wallpaperFolderIndex: saved.wallpaperFolderIndex ?? state.wallpaperFolderIndex,
    wallpaperFolderCount: saved.wallpaperFolderCount ?? state.wallpaperFolderCount,
    showDate: saved.showDate ?? state.showDate,
    dateFormat: saved.dateFormat ?? state.dateFormat,
    dateColor: saved.dateColor ?? state.dateColor,
    autoColor: saved.autoColor ?? state.autoColor,
    engine: saved.engine ?? state.engine,
    engines: saved.engines ?? state.engines,
    wallpaper: saved.wallpaper ?? state.wallpaper,
    wallpaperType: saved.wallpaperType ?? state.wallpaperType,
    dockEnabled: saved.dockEnabled ?? state.dockEnabled,
    dockCount: saved.dockCount ?? state.dockCount,
    accentColor: saved.accentColor ?? state.accentColor,
    glassStrength: saved.glassStrength ?? state.glassStrength,
    cardRadius: saved.cardRadius ?? state.cardRadius,
    tileDensity: saved.tileDensity ?? state.tileDensity,
    linkOpenIn: saved.linkOpenIn ?? state.linkOpenIn,
    searchRadius: saved.searchRadius ?? state.searchRadius,
    iconShape: saved.iconShape ?? state.iconShape,
    iconSize: saved.iconSize ?? state.iconSize,
    iconGlow: saved.iconGlow ?? state.iconGlow,
    tileHoverLift: saved.tileHoverLift ?? state.tileHoverLift,
    tileText: saved.tileText ?? state.tileText,
    glassShine: saved.glassShine ?? state.glassShine,
    tileEnter: saved.tileEnter ?? state.tileEnter,
    folderAnim: saved.folderAnim ?? state.folderAnim,
    wallpaperVignette: saved.wallpaperVignette ?? state.wallpaperVignette,
    searchOpacity: saved.searchOpacity ?? state.searchOpacity,
    searchAnim: saved.searchAnim ?? state.searchAnim, searchSwap: saved.searchSwap ?? state.searchSwap,
    dockOpacity: saved.dockOpacity ?? state.dockOpacity,
    dockHoverLift: saved.dockHoverLift ?? state.dockHoverLift,
    dockName: saved.dockName ?? state.dockName,
    links: saved.links ?? state.links,
    folders: saved.folders ?? state.folders,
    customPresets: saved.customPresets ?? state.customPresets
  })
}
/* 启动时本地无数据时，延迟重试从 sync 恢复（等待账号云同步重新拉取） */
export async function restoreFromSync() {
  if (!hasSyncStorage) return false
  try {
    const data = await readSyncState()
    if (data) { applySaved(data); refreshSyncUsage(); return true }
  } catch (e) { /* ignore */ }
  return false
}

/* ---------- 持久化触发 ---------- */
let saveTimer = null
function buildSnapshot() {
  return {
    theme: state.theme, style: state.style, hour12: state.hour12, showSeconds: state.showSeconds, blink: state.blink,
    clockFont: state.clockFont, clockColor: state.clockColor, clockPos: state.clockPos, searchPos: state.searchPos, dockPos: state.dockPos, layoutCustom: state.layoutCustom,
    wallpaperFolderMode: state.wallpaperFolderMode, wallpaperFolderInterval: state.wallpaperFolderInterval,
    wallpaperFolderIndex: state.wallpaperFolderIndex, wallpaperFolderCount: state.wallpaperFolderCount,
    showDate: state.showDate, dateFormat: state.dateFormat, dateColor: state.dateColor, autoColor: state.autoColor,
    engine: state.engine, engines: state.engines, dockEnabled: state.dockEnabled, dockCount: state.dockCount,
    accentColor: state.accentColor,
    glassStrength: state.glassStrength, cardRadius: state.cardRadius, tileDensity: state.tileDensity, linkOpenIn: state.linkOpenIn, searchRadius: state.searchRadius,
    iconShape: state.iconShape, iconSize: state.iconSize, iconGlow: state.iconGlow, tileHoverLift: state.tileHoverLift, tileText: state.tileText, glassShine: state.glassShine, tileEnter: state.tileEnter, folderAnim: state.folderAnim,
    wallpaperVignette: state.wallpaperVignette, searchOpacity: state.searchOpacity, searchAnim: state.searchAnim, searchSwap: state.searchSwap, dockOpacity: state.dockOpacity,
    dockHoverLift: state.dockHoverLift,
    dockName: state.dockName,
    links: state.links, folders: state.folders, customPresets: state.customPresets
  }
}
export function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => persistState(buildSnapshot()), 120)
}
/* 页面隐藏/关闭时立即落盘：newtab 页生命周期短，防抖期间关闭标签页会丢最近改动（H3）。
   仅当存在未保存的防抖定时器时才 flush，避免每次隐藏都重复全量写入 */
function flushSave() {
  if (!saveTimer) return
  clearTimeout(saveTimer)
  saveTimer = null
  persistState(buildSnapshot())
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave()
  })
}

// ============================================================
// 全局状态与业务逻辑（对应原型 JS，Vue 响应式化）
// ============================================================
import { reactive, ref, computed, watch, watchEffect, nextTick } from 'vue'
import { ensureFavicon, hostOf } from './faviconCache'
import { loadWallpaperBlob, saveWallpaperBlob, clearWallpaperBlob, kindOfBlob } from './wallpaperDB'

/* ---------- 工具 ---------- */
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

/* ---------- 常量 ---------- */
/* 默认搜索引擎：存于 state.engines（响应式、可增删改），编辑结果同步到搜索框引擎胶囊与下拉 */
export const DEFAULT_ENGINES = [
  { key: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}' },
  { key: 'bing', name: '必应', url: 'https://www.bing.com/search?q={q}' },
  { key: 'google', name: '谷歌', url: 'https://www.google.com/search?q={q}' },
  { key: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query={q}' }
]
export const WEEKS = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const GENERIC_FONTS = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy']
export const FALLBACK_FONTS = [
  'system-ui', 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Segoe UI', 'Noto Sans SC', 'Source Han Sans SC',
  'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'STSong', 'STKaiti', 'Songti SC', 'Heiti SC', 'Microsoft JhengHei',
  'Arial', 'Helvetica Neue', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
  'Roboto', 'Calibri', 'Cambria', 'Candara', 'Corbel', 'Constantia', 'Consolas', 'Courier New', 'Cascadia Mono',
  'Bahnschrift', 'Aptos', 'Segoe UI Variable', 'Sitka', 'Gabriola', 'Palatino Linotype', 'Book Antiqua',
  'Bookman Old Style', 'Garamond', 'Gill Sans MT', 'Lucida Console', 'Lucida Sans Unicode', 'Lucida Sans',
  'Lucida Handwriting', 'OCR A Extended', 'Rockwell', 'Segoe Script', 'Segoe Print', 'Copperplate Gothic',
  'Franklin Gothic Medium', 'Haettenschweiler', 'Marlett', 'Symbol', 'Webdings', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
  'Nirmala UI', 'Leelawadee UI', 'Malgun Gothic', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'MS PGothic',
  'MS UI Gothic', 'UD Digi Kyokasho N-R', 'HiraKakuProN-W3', 'Hiragino Sans GB', 'Gulim', 'Batang', 'Dotum',
  'Baskerville', 'Didot', 'Futura', 'Optima', 'Papyrus', 'Gill Sans', 'Hoefler Text', 'American Typewriter',
  'Courier', 'Monaco', 'Menlo', 'SF Mono', 'SF Pro Text', 'SF Pro Display', 'Apple Color Emoji', 'Segoe UI Emoji',
  'Segoe UI Symbol', 'DengXian', '等线', 'Ebrima', 'Gadugi', 'Ink Free', 'Javanese Text', 'Khmer UI',
  'Lao UI', 'Microsoft Himalaya', 'Microsoft New Tai Lue', 'Microsoft PhagsPa',
  'Microsoft Tai Le', 'Microsoft Yi Baiti', 'Mongolian Baiti', 'Myanmar Text', 'Nyala', 'Plantagenet Cherokee',
  'Segoe MDL2 Assets', 'SimSun-ExtB', 'Sylfaen', 'Tlwg Typist', 'Yu Mincho', 'PMingLiU',
  'MingLiU', 'DFKai-SB', '標楷體', 'TW-Kai', 'AR PL UKai CN', 'AR PL UMing CN', 'WenQuanYi Micro Hei',
  'WenQuanYi Zen Hei', 'Noto Serif SC', 'Noto Serif CJK SC', 'Source Han Serif SC', '思源宋体',
  /* 常见第三方字体（是否真的已安装由 Canvas 探测，未安装会被自动过滤） */
  'Inter', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Raleway', 'Oswald',
  'Merriweather', 'Playfair Display', 'Public Sans', 'Source Sans 3', 'Source Serif 4',
  'Source Code Pro', 'JetBrains Mono', 'Fira Code', 'Fira Sans',
  'IBM Plex Sans', 'IBM Plex Mono', 'IBM Plex Serif', 'Space Grotesk', 'Manrope', 'DM Sans', 'Work Sans',
  'Noto Sans', 'Noto Serif', 'Noto Sans Mono', 'Noto Sans CJK SC',
  'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'Liberation Sans', 'Liberation Serif', 'Liberation Mono',
  'Sarasa Gothic SC', 'HarmonyOS Sans SC', 'MiSans', 'MiSans VF', 'Mi Sans', 'Alibaba PuHuiTi 3.0', 'Alibaba PuHuiTi'
]

/* ---------- 默认数据 ---------- */
const DEFAULT_LINKS = [
  { id: 'l1', title: 'GitHub', url: 'https://github.com', folderId: null, inDock: true, iconMode: 'auto' },
  { id: 'l2', title: '哔哩哔哩', url: 'https://www.bilibili.com', folderId: null, inDock: true, iconMode: 'auto' },
  { id: 'l3', title: '掘金', url: 'https://juejin.cn', folderId: null, inDock: true, iconMode: 'auto' },
  { id: 'l4', title: '知乎', url: 'https://www.zhihu.com', folderId: null, inDock: false, iconMode: 'auto' },
  { id: 'l5', title: 'MDN', url: 'https://developer.mozilla.org', folderId: 'f1', inDock: false, iconMode: 'auto' },
  { id: 'l6', title: 'Stack Overflow', url: 'https://stackoverflow.com', folderId: 'f1', inDock: false, iconMode: 'auto' },
  { id: 'l7', title: 'Vue', url: 'https://vuejs.org', folderId: 'f1', inDock: false, iconMode: 'auto' }
]
const DEFAULT_FOLDERS = [{ id: 'f1', title: '开发工具' }]

const DEFAULTS = {
  view: 'home', theme: 'dark', style: 'glass', hour12: false, showSeconds: false, blink: false,
  clockFont: 'system-ui', clockColor: null, clockPos: 'top', autoColor: false,
  showDate: true, dateFormat: 'cn-long', dateColor: null,
  engine: 'baidu', engines: DEFAULT_ENGINES, wallpaper: null, wallpaperType: null, dockEnabled: true, dockCount: 7,
  accentColor: null,
  glassStrength: null, cardRadius: null, tileDensity: 'comfort', linkOpenIn: 'new', searchRadius: null,
  iconShape: 'rounded', iconSize: null, iconGlow: 50, tileHoverLift: 5, tileText: 'always', glassShine: true, tileEnter: 'drop', folderAnim: 'flip',
  wallpaperVignette: true, searchOpacity: 0.82, searchAnim: 'sink', dockOpacity: 0.72,
  links: DEFAULT_LINKS, folders: DEFAULT_FOLDERS, customPresets: []
}

/* 默认设置快照（用于重置） */
export const DEFAULT_SETTINGS = {
  theme: DEFAULTS.theme, style: DEFAULTS.style, hour12: DEFAULTS.hour12, showSeconds: DEFAULTS.showSeconds, blink: DEFAULTS.blink,
  clockFont: DEFAULTS.clockFont, clockColor: DEFAULTS.clockColor, clockPos: DEFAULTS.clockPos,
  showDate: DEFAULTS.showDate, dateFormat: DEFAULTS.dateFormat, dateColor: DEFAULTS.dateColor, autoColor: DEFAULTS.autoColor,
  engine: DEFAULTS.engine, wallpaper: DEFAULTS.wallpaper, wallpaperType: DEFAULTS.wallpaperType, dockEnabled: DEFAULTS.dockEnabled, dockCount: DEFAULTS.dockCount,
  accentColor: DEFAULTS.accentColor,
  glassStrength: DEFAULTS.glassStrength, cardRadius: DEFAULTS.cardRadius, tileDensity: DEFAULTS.tileDensity, linkOpenIn: DEFAULTS.linkOpenIn, searchRadius: DEFAULTS.searchRadius,
  iconShape: DEFAULTS.iconShape, iconSize: DEFAULTS.iconSize, iconGlow: DEFAULTS.iconGlow, tileHoverLift: DEFAULTS.tileHoverLift, tileText: DEFAULTS.tileText, glassShine: DEFAULTS.glassShine, tileEnter: DEFAULTS.tileEnter, folderAnim: DEFAULTS.folderAnim,
  wallpaperVignette: DEFAULTS.wallpaperVignette, searchOpacity: DEFAULTS.searchOpacity, searchAnim: DEFAULTS.searchAnim, dockOpacity: DEFAULTS.dockOpacity
}

/* ---------- 持久化封装：chrome.storage.local 优先，sync 云端备份，回退 localStorage ---------- */
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
    clockPos: saved.clockPos ?? state.clockPos,
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
    searchAnim: saved.searchAnim ?? state.searchAnim,
    dockOpacity: saved.dockOpacity ?? state.dockOpacity,
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

/* ---------- 响应式状态 ---------- */
const state = reactive({ ...JSON.parse(JSON.stringify(DEFAULTS)) })

/* 视频壁纸标记：objectURL 无法反推 mime，靠内存态类型字段判定（来源 Blob.type，加载即自愈） */
export const isVideoWallpaper = computed(() => !!state.wallpaper && state.wallpaperType === 'video')

// 非持久化 UI 状态
const ui = reactive({
  now: new Date(),
  homeLeaving: false,
  linksLeaving: false,
  dropdownOpen: false,
  modal: null,                 // 'settings' | 'wallpaper' | 'about' | null
  searchQuery: '',
  searchFilter: '',
  flip: false,
  linkForm: { visible: false, mode: 'add', id: null, url: '', name: '', batch: false, batchText: '', folderSel: '', newFolder: '', err: '', top: 0, left: 0 },
  ctxMenu: { visible: false, x: 0, y: 0, items: [], linkId: null, inFolder: false },
  confirm: { visible: false, title: '', desc: '', kind: null, linkId: null, folderId: null, dockId: null, presetId: null },
  folderOpenId: null,
  folderClosing: false,
  toast: { visible: false, msg: '', err: false },
  fontList: [],
  tourActive: false,              // 新手指引进行中
  tourRightClickEnter: false      // 引导期间：当前步骤是否允许右键空白进入链接页
})

/* ---------- 时钟 ---------- */
let clockTimer = null
function startClock() {
  clearInterval(clockTimer)
  // 显示秒时高频刷新，否则低频即可（降低 CPU / 渲染开销）
  clockTimer = setInterval(() => { ui.now = new Date() }, state.showSeconds ? 250 : 1000)
}
startClock()
watch(state.showSeconds, startClock)
/* ---------- 农历（公历 → 农历，1900-2100 查表） ---------- */
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
]
const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊']
const LUNAR_DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0 }
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29 }
function lunarYearDays(y) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0
  return sum + lunarLeapDays(y)
}
function solarToLunar(date) {
  const base = Date.UTC(1900, 0, 31)
  let offset = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - base) / 86400000)
  let temp = 0, y = 1900
  for (; y < 2101 && offset > 0; y++) { temp = lunarYearDays(y); offset -= temp }
  if (offset < 0) { offset += temp; y-- }
  const leap = lunarLeapMonth(y)
  let isLeap = false, m = 1
  for (; m < 13 && offset > 0; m++) {
    if (leap > 0 && m === leap + 1 && !isLeap) { --m; isLeap = true; temp = lunarLeapDays(y) }
    else { temp = lunarMonthDays(y, m) }
    if (isLeap && m === leap + 1) isLeap = false
    offset -= temp
  }
  if (offset === 0 && leap > 0 && m === leap + 1) {
    if (isLeap) isLeap = false
    else { isLeap = true; --m }
  }
  if (offset < 0) { offset += temp; --m }
  return { year: y, month: m, day: offset + 1, isLeap }
}

export function formatDate(d, fmt) {
  const y = d.getFullYear(), mo = d.getMonth(), da = d.getDate(), wd = d.getDay()
  const p = n => String(n).padStart(2, '0')
  switch (fmt) {
    case 'cn-long': return `${y}年${mo + 1}月${da}日 星期${WEEKS[wd]}`
    case 'cn-short': return `${y}-${p(mo + 1)}-${p(da)} 周${WEEKS[wd]}`
    case 'en-long': return `${WEEK_EN[wd]}, ${MONTH_EN[mo]} ${da}, ${y}`
    case 'numeric': return `${p(mo + 1)}/${p(da)} 周${WEEKS[wd]}`
    case 'weekday': return `星期${WEEKS[wd]}`
    case 'lunar': {
      const l = solarToLunar(d)
      return `农历${l.isLeap ? '闰' : ''}${LUNAR_MONTHS[l.month - 1]}月${LUNAR_DAYS[l.day - 1]}`
    }
    default: return `${y}年${mo + 1}月${da}日 星期${WEEKS[wd]}`
  }
}
/* ---------- 自动适配时间/日期颜色（开关，换壁纸动态调整） ---------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
  }
  return [h, s, l]
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 1 / 6) [r, g, b] = [c, x, 0]
  else if (h < 2 / 6) [r, g, b] = [x, c, 0]
  else if (h < 3 / 6) [r, g, b] = [0, c, x]
  else if (h < 4 / 6) [r, g, b] = [0, x, c]
  else if (h < 5 / 6) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}
/* 从壁纸提取主色 / 次色 / 平均色（按色相分桶取像素最多的两簇，跳过灰暗色） */
function sampleWallpaperPalette(src) {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 40; c.height = 40
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 40, 40)
      try {
        const d = ctx.getImageData(0, 0, 40, 40).data
        const buckets = {}, avg = [0, 0, 0]
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          avg[0] += r; avg[1] += g; avg[2] += b; n++
          const [h, s] = rgbToHsl(r, g, b)
          if (s < 0.2) continue
          const idx = Math.floor(h / 30) % 12
          const bk = buckets[idx] || (buckets[idx] = { r: 0, g: 0, b: 0, n: 0 })
          bk.r += r; bk.g += g; bk.b += b; bk.n++
        }
        const keys = Object.keys(buckets).sort((a, b) => buckets[b].n - buckets[a].n)
        const mk = k => buckets[k] ? [Math.round(buckets[k].r / buckets[k].n), Math.round(buckets[k].g / buckets[k].n), Math.round(buckets[k].b / buckets[k].n)] : null
        res({ dominant: mk(keys[0]), secondary: mk(keys[1]), average: [Math.round(avg[0] / n), Math.round(avg[1] / n), Math.round(avg[2] / n)] })
      } catch (e) { res(null) }
    }
    img.onerror = () => res(null)
    img.src = src
  })
}
/* 时间取主色、日期取次色：保留色相/饱和度，仅把亮度调到目标区间（亮壁纸→深色文字，暗壁纸→亮色文字），保证可读且颜色鲜明 */
export async function autoFitClockColors() {
  let pal = null
  if (state.wallpaper && state.wallpaperType !== 'video') pal = await sampleWallpaperPalette(state.wallpaper)
  const fallback = resolvedTheme.value === 'dark' ? '#f2fdfb' : '#0d2b2e'
  if (!pal || !pal.dominant) { state.clockColor = fallback; state.dateColor = fallback; save(); return }
  const toColor = c => {
    const [h, s, l] = rgbToHsl(c[0], c[1], c[2])
    return hslToRgb(h, Math.max(0.25, s), l > 0.55 ? 0.32 : 0.78)
  }
  state.clockColor = toColor(pal.dominant)
  state.dateColor = pal.secondary ? toColor(pal.secondary) : state.clockColor
  save()
}
/* 壁纸 / 开关变化：自动适配开启则动态重算 */
watch(() => [state.wallpaper, state.wallpaperType, state.autoColor], () => { if (state.autoColor) autoFitClockColors() })

export const clockParts = () => {
  const d = ui.now
  let h = d.getHours(), am = ''
  if (state.hour12) { am = h < 12 ? '上午' : '下午'; h = h % 12 || 12 }
  return {
    h: String(h).padStart(2, '0'),
    m: String(d.getMinutes()).padStart(2, '0'),
    s: String(d.getSeconds()).padStart(2, '0'),
    am,
    date: formatDate(d, state.dateFormat)
  }
}

/* ---------- toast ---------- */
let toastTimer = null
export function toast(msg, err) {
  ui.toast.msg = msg
  ui.toast.err = !!err
  ui.toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { ui.toast.visible = false }, 1800)
}

/* ---------- 主题 / 位置预设：应用到 body/html（驱动全局 CSS 类） ---------- */
const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
/* 跟随系统：OS 深浅色切换需实时响应（响应式值驱动下方 watchEffect 重跑） */
const systemDark = ref(darkMq.matches)
const onSystemDarkChange = e => { systemDark.value = e.matches }
if (darkMq.addEventListener) darkMq.addEventListener('change', onSystemDarkChange)
else if (darkMq.addListener) darkMq.addListener(onSystemDarkChange)
/* 解析后的最终主题（CSS 与组件复用，纯响应式来源） */
export const resolvedTheme = computed(() => state.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : state.theme)
watchEffect(() => {
  document.documentElement.dataset.theme = resolvedTheme.value
})
/* 风格维度：glass（毛玻璃，默认）/ fluent（Fluent 2）/ borderless（无界），驱动 CSS [data-style] 覆盖块 */
watchEffect(() => {
  const s = state.style
  document.documentElement.dataset.style = (s === 'fluent' || s === 'borderless') ? s : 'glass'
})
/* 搜索框动画维度：none / sink（沉入）/ lift（浮升），驱动 CSS [data-search-anim] */
watchEffect(() => {
  document.documentElement.dataset.searchAnim = state.searchAnim || 'none'
})
/* 磁贴入场动画：fade（整体淡入）/ drop（依次落位），驱动 CSS [data-tile-enter] */
watchEffect(() => {
  document.documentElement.dataset.tileEnter = state.tileEnter === 'drop' ? 'drop' : 'fade'
})
/* 文件夹展开动画：normal（缩放）/ flip（3D 翻转），驱动 CSS [data-folder-anim] */
watchEffect(() => {
  document.documentElement.dataset.folderAnim = state.folderAnim === 'flip' ? 'flip' : 'normal'
})
watchEffect(() => {
  const pos = state.clockPos || 'top'
  const b = document.body
  ;['top', 'mid', 'bottom', 'left', 'right'].forEach(p => b.classList.toggle('clock-pos-' + p, p === pos))
})

/* ---------- 主题色：单一主色 → 自动派生全套（按钮/文字/图标/hover 联动） ---------- */
function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) return [57, 197, 187]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const mixChannel = (a, b, p) => Math.round(a + (b - a) * p)
/* WCAG 相对亮度与对比度（AA 标准：普通文字 4.5:1，大号/图标 3:1） */
const relLum = ([r, g, b]) => {
  const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrastRatio = (hexA, hexB) => {
  const l1 = relLum(hexToRgb(hexA)), l2 = relLum(hexToRgb(hexB))
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}
/* 迭代压深(light)/提亮(dark)直到对比度 ≥4.5:1，返回首个达标色 */
function ensureContrast(hex, bgHex, toLight) {
  let cur = hex
  for (let p = 0.15; p <= 0.85; p += 0.1) {
    const [r, g, b] = hexToRgb(hex)
    cur = rgbToHex([mixChannel(r, toLight ? 255 : 0, p), mixChannel(g, toLight ? 255 : 0, p), mixChannel(b, toLight ? 255 : 0, p)])
    if (contrastRatio(cur, bgHex) >= 4.5) return cur
  }
  return cur
}
const ACCENT_KEYS = ['--accent', '--accent-rgb', '--accent-on', '--accent-icon-text', '--accent-text', '--accent-grad-a', '--accent-grad-b']
watchEffect(() => {
  const el = document.documentElement
  if (!state.accentColor) {
    /* 未自定义 → 移除内联变量，回落到 CSS 默认主题色 */
    ACCENT_KEYS.forEach(k => el.style.removeProperty(k))
    return
  }
  const [r, g, b] = hexToRgb(state.accentColor)
  /* 按钮/图标文字：在 #fff 与深色锚点里选对比度更高者 */
  const onColor = contrastRatio(state.accentColor, '#ffffff') >= contrastRatio(state.accentColor, '#04302e') ? '#ffffff' : '#04302e'
  /* 渐变暗端：主色压深 35% */
  const deep = rgbToHex([mixChannel(r, 0, .35), mixChannel(g, 0, .35), mixChannel(b, 0, .35)])
  const [dr, dg, db] = hexToRgb(deep)
  /* 前景强调文字：按主题压深/提亮，直到对玻璃背景对比度达标 */
  const text = resolvedTheme.value === 'dark'
    ? ensureContrast(state.accentColor, '#0a141a', true)
    : ensureContrast(state.accentColor, '#ffffff', false)
  el.style.setProperty('--accent', state.accentColor)
  el.style.setProperty('--accent-rgb', `${r},${g},${b}`)
  el.style.setProperty('--accent-on', onColor)
  el.style.setProperty('--accent-icon-text', onColor)
  el.style.setProperty('--accent-text', text)
  el.style.setProperty('--accent-grad-a', `rgba(${r},${g},${b},.92)`)
  el.style.setProperty('--accent-grad-b', `rgba(${dr},${dg},${db},.95)`)
})

/* ---------- 布局微调：毛玻璃强度 / 卡片圆角 / 卡片密度 / 搜索框圆角 / 图标形状尺寸 ---------- */
const DENSITY = {
  /* 间距 / 磁贴宽 / 图标-文字间距 / 图标尺寸：宽松需整体放大，避免只拉宽卡片 */
  compact: { gap: '14px', w: '92px', gapIn: '8px', ico: '38px' },
  comfort: { gap: '26px', w: '106px', gapIn: '12px', ico: '46px' },
  spacious: { gap: '40px', w: '128px', gapIn: '18px', ico: '54px' }
}
/* 图标形状 → 圆角半径：circle 恒 50%，方形固定小圆角，半圆角为「两圆两方」对角异形（左上/右下圆角、右上/左下直角） */
const ICON_SHAPES = {
  square: '5px',
  rounded: 'calc(13px * var(--radius-scale,1))',
  squircle: '30% 5px 30% 5px',
  circle: '50%'
}
watchEffect(() => {
  const el = document.documentElement
  if (state.glassStrength == null) el.style.removeProperty('--glass-a')
  else el.style.setProperty('--glass-a', String(state.glassStrength))
  if (state.cardRadius == null) el.style.removeProperty('--radius-scale')
  else el.style.setProperty('--radius-scale', String(state.cardRadius / 19))
  if (state.searchRadius == null) el.style.removeProperty('--search-radius')
  else el.style.setProperty('--search-radius', state.searchRadius + 'px')
  /* 图标形状圆角 */
  el.style.setProperty('--ico-radius', ICON_SHAPES[state.iconShape] || ICON_SHAPES.rounded)
  const d = DENSITY[state.tileDensity] || DENSITY.comfort
  /* 图标尺寸：手动指定则覆盖密度的预设尺寸 */
  const ico = state.iconSize != null ? state.iconSize + 'px' : d.ico
  el.style.setProperty('--tile-gap', d.gap)
  el.style.setProperty('--tile-w', d.w)
  el.style.setProperty('--tile-gap-in', d.gapIn)
  el.style.setProperty('--tile-ico', ico)
  /* 磁贴高度 = 上下内边距(30) + 图标 + 图标-文字间距 + 标题行高(约16)，用于对齐“添加”磁贴 */
  el.style.setProperty('--tile-h', `calc(46px + ${ico} + ${d.gapIn})`)
  /* 悬浮上浮距离（0 关闭，负值向上）+ 图标光晕强度（映射到 0~0.6 透明度） */
  el.style.setProperty('--tile-hover-lift', (-state.tileHoverLift) + 'px')
  el.style.setProperty('--tile-glow', (state.iconGlow / 100 * 0.6).toFixed(2))
})

/* ---------- 搜索引擎 ---------- */
export function setEngine(key) {
  const eng = state.engines.find(x => x.key === key)
  if (!eng || eng.key === state.engine) return
  state.engine = eng.key
  save()
  toast('已切换至 ' + eng.name)
}
export function cycleEngine() {
  const list = state.engines
  if (!list.length) return
  const i = list.findIndex(x => x.key === state.engine)
  setEngine(list[(i + 1) % list.length].key)
  ui.flip = true
  setTimeout(() => { ui.flip = false }, 500)
}
export function doSearch() {
  const q = ui.searchQuery.trim()
  if (!q) return
  const eng = state.engines.find(x => x.key === state.engine)
  if (!eng) return
  /* 协议白名单：引擎 url 可能来自导入/同步的不可信数据，拒绝非 http/https（H1） */
  if (!/^https?:\/\//i.test(eng.url)) return
  window.open(eng.url.replace('{q}', encodeURIComponent(q)), '_self')
}
/* 引擎增删改：编辑结果即时反映到搜索框引擎胶囊与下拉 */
export function addEngine(name, url) {
  const key = uid()
  state.engines.push({ key, name, url })
  save()
  return key
}
export function updateEngine(key, name, url) {
  const e = state.engines.find(x => x.key === key)
  if (e) { e.name = name; e.url = url; save() }
}
export function deleteEngine(key) {
  state.engines = state.engines.filter(x => x.key !== key)
  if (state.engine === key) state.engine = state.engines[0]?.key || ''
  save()
}

/* ---------- 视图切换 ---------- */
export function setView(v) {
  if (state.view === v) return
  if (v === 'home' && state.view === 'links' && !ui.linksLeaving && state.tileEnter === 'drop') {
    /* 离开链接页且磁贴为落位模式：先播磁贴依次收起动画（linksLeaving），
       结束后再切视图，避免磁贴瞬间隐藏而生硬。
       先立即关掉弹层/下拉（否则收起动画期间设置下拉还开着，观感割裂），
       同时移除 linksSection 的 view-enter（入场动画类）——否则落位动画特异性
       高于收起动画，收起会被入场动画覆盖而失效 */
    ui.linksLeaving = true
    closeAllPopups()
    closeFolder()
    document.getElementById('linksSection')?.classList.remove('view-enter')
    setTimeout(() => {
      ui.linksLeaving = false
      state.view = 'home'
      ui.homeLeaving = false
      save()
    }, 560)
    return
  }
  state.view = v
  closeAllPopups()
  closeFolder()
  if (v === 'home') {
    ui.homeLeaving = false
    save()
    return
  }
  if (v === 'links') {
    ui.homeLeaving = true
    setTimeout(() => { ui.homeLeaving = false }, 280)
    save()
  }
}
export function closeAllPopups() {
  ui.dropdownOpen = false
  ui.modal = null
  ui.ctxMenu.visible = false
  ui.linkForm.visible = false
  ui.confirm.visible = false
}

/* ---- 临时打点：追踪表单 visible 何时被打开 ---- */
if (typeof window !== 'undefined') {
  console.log('[LF] watch registered, linkForm=', JSON.stringify(ui.linkForm))
  watch(() => ui.linkForm.visible, v => {
    if (v) console.log('[LF] visible -> true, stack:\n', new Error().stack.split('\n').slice(2, 6).join('\n'))
    else console.log('[LF] visible -> false')
  })
}

/* 启动新手指引：收起下拉与弹窗，回到主页从第一步开始 */
export function startTour() {
  closeAllPopups()
  if (state.view !== 'home') setView('home')
  ui.tourActive = true
}

/* ---------- 右键 / 上下文菜单 ---------- */
export function openCtxAt(e, items, linkId, inFolder) {
  ui.ctxMenu.items = items
  ui.ctxMenu.linkId = linkId
  ui.ctxMenu.inFolder = !!inFolder
  ui.ctxMenu.visible = true
  ui.ctxMenu.x = e.clientX
  ui.ctxMenu.y = e.clientY
}
export function closeCtx() { ui.ctxMenu.visible = false }
export function ctxAction(act) {
  const id = ui.ctxMenu.linkId
  const l = state.links.find(x => x.id === id)
  const anchor = id ? document.querySelector(`[data-id="${id}"]`) : null
  if (act === 'edit') {
    if (id && anchor) { closeCtx(); openEditForm(anchor, id) }
    else closeCtx()
  } else if (act === 'out') {
    closeCtx(); moveOutFolder(id)
  } else if (act === 'dock') {
    if (l) { l.inDock = true; save(); toast('已添加到拓展坞'); closeCtx() }
  } else if (act === 'undock') {
    if (l) { l.inDock = false; save(); toast('已从拓展坞删除'); closeCtx() }
  } else if (act === 'icon-auto') {
    if (l) { l.iconMode = 'auto'; save(); toast('图标已切换为自动适配'); closeCtx() }
  } else if (act === 'icon-text') {
    if (l) { l.iconMode = 'text'; save(); toast('图标已切换为文字图标'); closeCtx() }
  } else if (act === 'confirm-undock') {
    if (l) { closeCtx(); showConfirm('dock', null, null, l.id, '从拓展坞删除「' + l.title + '」？', '仅从拓展坞移除，链接不会被删除') }
  } else if (act === 'del') {
    closeCtx(); deleteLink(id)
  }
}
export function buildCtxItems(linkId, inFolder) {
  const l = state.links.find(x => x.id === linkId)
  const items = [{ act: 'edit', label: '编辑', icon: 'edit' }]
  if (inFolder) items.push({ act: 'out', label: '移出文件夹', icon: 'out' })
  items.push(l && l.iconMode === 'text'
    ? { act: 'icon-auto', label: '图标：自动适配', icon: 'image' }
    : { act: 'icon-text', label: '图标：文字图标', icon: 'image' })
  items.push(l && l.inDock
    ? { act: 'undock', label: '从拓展坞删除', icon: 'pin' }
    : { act: 'dock', label: '添加到拓展坞', icon: 'pin' })
  items.push({ act: 'del', label: '删除', icon: 'trash', danger: true })
  return items
}

/* ---------- 确认框 ---------- */
export function showConfirm(kind, linkId, folderId, dockId, title, desc) {
  ui.confirm.kind = kind
  ui.confirm.linkId = linkId
  ui.confirm.folderId = folderId
  ui.confirm.dockId = dockId
  ui.confirm.title = title
  ui.confirm.desc = desc
  ui.confirm.visible = true
}
export function confirmOk() {
  const c = ui.confirm
  if (c.kind === 'reset') {
    resetSettings()
    toast('已重置所有设置')
  } else if (c.kind === 'dock') {
    const l = state.links.find(x => x.id === c.dockId)
    if (l) { l.inDock = false; toast('已从拓展坞删除「' + l.title + '」') }
  } else if (c.kind === 'folder') {
    state.links.forEach(l => { if (l.folderId === c.folderId) l.folderId = null })
    state.folders = state.folders.filter(x => x.id !== c.folderId)
    closeFolder()
    toast('文件夹已删除')
  } else if (c.kind === 'link') {
    const l = state.links.find(x => x.id === c.linkId)
    if (l) {
      const fid = l.folderId
      state.links = state.links.filter(x => x.id !== c.linkId)
      if (fid) pruneEmptyFolders()
    }
    toast('已删除')
  } else if (c.kind === 'preset') {
    deletePreset(c.presetId)
    toast('预设已删除')
  }
  c.visible = false
  save()
}

/* ---------- 自定义预设 ---------- */
/* 外观相关字段（保存当前设置为自定义预设） */
const PRESET_FIELDS = [
  'theme', 'style', 'accentColor', 'glassStrength', 'glassShine', 'cardRadius', 'tileDensity',
  'searchRadius', 'searchOpacity', 'dockOpacity', 'iconShape', 'iconSize', 'iconGlow', 'tileHoverLift',
  'tileText', 'searchAnim', 'tileEnter', 'folderAnim', 'hour12', 'clockPos', 'clockColor', 'dateColor',
  'dateFormat', 'showDate', 'showSeconds', 'blink', 'clockFont', 'wallpaperVignette', 'dockEnabled', 'dockCount', 'linkOpenIn'
]
/* 保存当前设置快照为自定义预设（name/desc 可空，渲染时回退默认） */
export function saveCurrentAsPreset(name = '', desc = '') {
  const settings = {}
  for (const k of PRESET_FIELDS) settings[k] = state[k]
  const id = uid()
  state.customPresets.push({ id, settings, time: Date.now(), name, desc })
  save()
  return id
}
export function deletePreset(id) {
  state.customPresets = state.customPresets.filter(p => p.id !== id)
}
export function confirmCancel() { ui.confirm.visible = false }

/* ---------- 文件夹面板 ---------- */
let folderCloseTimer = null
export function closeFolder() {
  if (!ui.folderOpenId && !ui.folderClosing) return
  ui.folderOpenId = null
  ui.folderClosing = true
  clearTimeout(folderCloseTimer)
  folderCloseTimer = setTimeout(() => { ui.folderClosing = false }, 240)
}
export function openFolder(fid) {
  clearTimeout(folderCloseTimer)
  ui.folderClosing = false
  ui.folderOpenId = fid
}
export function renameFolder(fid, title) {
  const f = state.folders.find(x => x.id === fid)
  if (f && title.trim()) { f.title = title.trim(); save() }
}
export function deleteFolder(fid) {
  const f = state.folders.find(x => x.id === fid)
  showConfirm('folder', null, fid, null, '删除文件夹「' + (f ? f.title : '') + '」？', '文件夹内链接将移出，不会删除')
}

/* 自动删除空文件夹（无链接归属时），返回是否删除了文件夹 */
export function pruneEmptyFolders() {
  let removed = false
  state.folders.forEach(f => {
    if (!state.links.some(l => l.folderId === f.id)) {
      state.folders = state.folders.filter(x => x.id !== f.id)
      /* 若删除的是当前打开的面板，关闭面板遮罩 */
      if (ui.folderOpenId === f.id) {
        ui.folderOpenId = null
        ui.folderClosing = true
        clearTimeout(folderCloseTimer)
        folderCloseTimer = setTimeout(() => { ui.folderClosing = false }, 240)
      }
      removed = true
    }
  })
  return removed
}

/* ---------- 链接增删改 ---------- */
export function openAddForm(anchorEl, folderId) {
  ui.linkForm.mode = 'add'
  ui.linkForm.id = null
  ui.linkForm.url = ''
  ui.linkForm.name = ''
  ui.linkForm.batch = false
  ui.linkForm.batchText = ''
  ui.linkForm.folderSel = folderId || ''
  ui.linkForm.newFolder = ''
  ui.linkForm.err = ''
  ui.linkForm.visible = true
  nextTick(() => positionForm(anchorEl))
}
export function openEditForm(anchorEl, id) {
  const l = state.links.find(x => x.id === id)
  if (!l) return
  ui.linkForm.mode = 'edit'
  ui.linkForm.id = id
  ui.linkForm.url = l.url
  ui.linkForm.name = l.title
  ui.linkForm.folderSel = l.folderId || ''
  ui.linkForm.newFolder = ''
  ui.linkForm.err = ''
  ui.linkForm.visible = true
  nextTick(() => positionForm(anchorEl))
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
}
export function closeForm() { ui.linkForm.visible = false }
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
  window.open(url, state.linkOpenIn === 'self' ? '_self' : '_blank')
}
export function deleteLink(id) {
  const l = state.links.find(x => x.id === id)
  showConfirm('link', id, null, null, '删除「' + (l ? l.title : '') + '」？', '删除后不可恢复')
}

/* ---------- 拓展坞可见性 ---------- */
export const dockVisible = () => {
  const list = state.links.filter(l => l.inDock)
  return state.dockEnabled && list.length > 0 && state.view === 'home'
}

/* body 状态类同步（links-open / dock-visible / links-leaving / tour-active） */
watchEffect(() => {
  document.body.classList.toggle('links-open', state.view === 'links')
  document.body.classList.toggle('links-leaving', ui.linksLeaving)
  document.body.classList.toggle('tour-active', ui.tourActive)
  const visible = dockVisible()
  document.body.classList.toggle('dock-visible', visible)
})

/* 壁纸暗角开关 */
watchEffect(() => {
  document.body.classList.toggle('vignette-on', !!state.wallpaperVignette)
})

/* 外观 body 类：磁贴名称显示模式 / 悬浮动效关闭 / 玻璃高光 */
watchEffect(() => {
  document.body.classList.toggle('tile-text-hover', state.tileText === 'hover')
  document.body.classList.toggle('tile-text-none', state.tileText === 'none')
  document.body.classList.toggle('no-tile-hover', state.tileHoverLift <= 0)
  /* glass-shine 高光仅毛玻璃风格生效；Fluent 下高光/玻璃投影由 [data-style] 覆盖统一处理 */
  document.body.classList.toggle('glass-shine', !!state.glassShine && state.style !== 'fluent' && state.style !== 'borderless')
})

/* 搜索框 / 拓展坞透明度（注入到 html：--search-bg 等 token 定义在 [data-theme] 上） */
watchEffect(() => {
  document.documentElement.style.setProperty('--search-alpha', String(state.searchOpacity))
  document.documentElement.style.setProperty('--dock-alpha', String(state.dockOpacity))
})

/* ---------- 字体 ---------- */
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

/* ---------- 持久化触发 ---------- */
let saveTimer = null
function buildSnapshot() {
  return {
    theme: state.theme, style: state.style, hour12: state.hour12, showSeconds: state.showSeconds, blink: state.blink,
    clockFont: state.clockFont, clockColor: state.clockColor, clockPos: state.clockPos,
    showDate: state.showDate, dateFormat: state.dateFormat, dateColor: state.dateColor, autoColor: state.autoColor,
    engine: state.engine, engines: state.engines, dockEnabled: state.dockEnabled, dockCount: state.dockCount,
    accentColor: state.accentColor,
    glassStrength: state.glassStrength, cardRadius: state.cardRadius, tileDensity: state.tileDensity, linkOpenIn: state.linkOpenIn, searchRadius: state.searchRadius,
    iconShape: state.iconShape, iconSize: state.iconSize, iconGlow: state.iconGlow, tileHoverLift: state.tileHoverLift, tileText: state.tileText, glassShine: state.glassShine, tileEnter: state.tileEnter, folderAnim: state.folderAnim,
    wallpaperVignette: state.wallpaperVignette, searchOpacity: state.searchOpacity, searchAnim: state.searchAnim, dockOpacity: state.dockOpacity,
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

/* ---------- 重置所有设置（保留 links/folders） ---------- */
export function resetSettings() {
  const oldWallpaper = state.wallpaper
  const oldType = state.wallpaperType
  Object.assign(state, {
    theme: DEFAULT_SETTINGS.theme, style: DEFAULT_SETTINGS.style, hour12: DEFAULT_SETTINGS.hour12,
    showSeconds: DEFAULT_SETTINGS.showSeconds, blink: DEFAULT_SETTINGS.blink,
    clockFont: DEFAULT_SETTINGS.clockFont, clockColor: DEFAULT_SETTINGS.clockColor,
    clockPos: DEFAULT_SETTINGS.clockPos, showDate: DEFAULT_SETTINGS.showDate,
    dateFormat: DEFAULT_SETTINGS.dateFormat, dateColor: DEFAULT_SETTINGS.dateColor, autoColor: DEFAULT_SETTINGS.autoColor,
    engine: DEFAULT_SETTINGS.engine, wallpaper: DEFAULT_SETTINGS.wallpaper, wallpaperType: DEFAULT_SETTINGS.wallpaperType,
    dockEnabled: DEFAULT_SETTINGS.dockEnabled, dockCount: DEFAULT_SETTINGS.dockCount,
    accentColor: DEFAULT_SETTINGS.accentColor,
    glassStrength: DEFAULT_SETTINGS.glassStrength, cardRadius: DEFAULT_SETTINGS.cardRadius, tileDensity: DEFAULT_SETTINGS.tileDensity, linkOpenIn: DEFAULT_SETTINGS.linkOpenIn, searchRadius: DEFAULT_SETTINGS.searchRadius,
    iconShape: DEFAULT_SETTINGS.iconShape, iconSize: DEFAULT_SETTINGS.iconSize, iconGlow: DEFAULT_SETTINGS.iconGlow, tileHoverLift: DEFAULT_SETTINGS.tileHoverLift, tileText: DEFAULT_SETTINGS.tileText, glassShine: DEFAULT_SETTINGS.glassShine, tileEnter: DEFAULT_SETTINGS.tileEnter, folderAnim: DEFAULT_SETTINGS.folderAnim,
    wallpaperVignette: DEFAULT_SETTINGS.wallpaperVignette,
    searchOpacity: DEFAULT_SETTINGS.searchOpacity, searchAnim: DEFAULT_SETTINGS.searchAnim, dockOpacity: DEFAULT_SETTINGS.dockOpacity
  })
  /* 重置设置同时清掉 IndexedDB 壁纸，并释放本页 objectURL。
     video 元素正在解码时立即 revoke 会报 Failed to load resource，故延迟 1s 释放 */
  if (oldWallpaper) {
    if (oldWallpaper.startsWith('blob:')) {
      if (oldType === 'video') setTimeout(() => URL.revokeObjectURL(oldWallpaper), 1000)
      else URL.revokeObjectURL(oldWallpaper)
    }
    clearWallpaperBlob().catch(() => {})
  }
  ui.searchFilter = ''
  save()
}

export { state, ui }

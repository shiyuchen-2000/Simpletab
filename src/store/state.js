// ============================================================
// 响应式状态：DEFAULTS / DEFAULT_SETTINGS / state / ui / toast
// 所有领域模块的依赖最底层（其余模块只从这里取 state/ui，不反向依赖）
// ============================================================
import { reactive, ref, computed } from 'vue'
import { DEFAULT_ENGINES } from './constants'

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
  clockFont: 'system-ui', clockColor: null, clockPos: 'top', autoColor: false, searchPos: 'mid', dockPos: 'bottom', layoutCustom: null,
  wallpaperFolderMode: null, wallpaperFolderInterval: 30, wallpaperFolderIndex: -1, wallpaperFolderCount: 0,
  showDate: true, dateFormat: 'cn-long', dateColor: null,
  engine: 'baidu', engines: DEFAULT_ENGINES, wallpaper: null, wallpaperType: null, dockEnabled: true, dockCount: 7,
  accentColor: null,
  glassStrength: null, cardRadius: null, tileDensity: 'comfort', linkOpenIn: 'new', searchRadius: null,
  iconShape: 'rounded', iconSize: null, iconGlow: 50, tileHoverLift: 5, tileText: 'always', glassShine: true, tileEnter: 'drop', folderAnim: 'flip',
  wallpaperVignette: true, searchOpacity: 0.82, searchAnim: 'sink', searchSwap: false, dockOpacity: 0.72, dockHoverLift: 6, dockName: true,
  links: DEFAULT_LINKS, folders: DEFAULT_FOLDERS, customPresets: []
}

/* 默认设置快照（用于重置） */
export const DEFAULT_SETTINGS = {
  theme: DEFAULTS.theme, style: DEFAULTS.style, hour12: DEFAULTS.hour12, showSeconds: DEFAULTS.showSeconds, blink: DEFAULTS.blink,
  clockFont: DEFAULTS.clockFont, clockColor: DEFAULTS.clockColor, clockPos: DEFAULTS.clockPos,
  searchPos: DEFAULTS.searchPos, dockPos: DEFAULTS.dockPos, layoutCustom: DEFAULTS.layoutCustom,
  wallpaperFolderMode: DEFAULTS.wallpaperFolderMode, wallpaperFolderInterval: DEFAULTS.wallpaperFolderInterval,
  wallpaperFolderIndex: DEFAULTS.wallpaperFolderIndex, wallpaperFolderCount: DEFAULTS.wallpaperFolderCount,
  showDate: DEFAULTS.showDate, dateFormat: DEFAULTS.dateFormat, dateColor: DEFAULTS.dateColor, autoColor: DEFAULTS.autoColor,
  engine: DEFAULTS.engine, wallpaper: DEFAULTS.wallpaper, wallpaperType: DEFAULTS.wallpaperType, dockEnabled: DEFAULTS.dockEnabled, dockCount: DEFAULTS.dockCount,
  accentColor: DEFAULTS.accentColor,
  glassStrength: DEFAULTS.glassStrength, cardRadius: DEFAULTS.cardRadius, tileDensity: DEFAULTS.tileDensity, linkOpenIn: DEFAULTS.linkOpenIn, searchRadius: DEFAULTS.searchRadius,
  iconShape: DEFAULTS.iconShape, iconSize: DEFAULTS.iconSize, iconGlow: DEFAULTS.iconGlow, tileHoverLift: DEFAULTS.tileHoverLift, tileText: DEFAULTS.tileText, glassShine: DEFAULTS.glassShine, tileEnter: DEFAULTS.tileEnter, folderAnim: DEFAULTS.folderAnim,
  wallpaperVignette: DEFAULTS.wallpaperVignette, searchOpacity: DEFAULTS.searchOpacity, searchAnim: DEFAULTS.searchAnim, searchSwap: DEFAULTS.searchSwap, dockOpacity: DEFAULTS.dockOpacity, dockHoverLift: DEFAULTS.dockHoverLift, dockName: DEFAULTS.dockName
}

/* ---------- 响应式状态 ---------- */
export const state = reactive({ ...JSON.parse(JSON.stringify(DEFAULTS)) })

/* 视频壁纸标记：objectURL 无法反推 mime，靠内存态类型字段判定（来源 Blob.type，加载即自愈） */
export const isVideoWallpaper = computed(() => !!state.wallpaper && state.wallpaperType === 'video')

// 非持久化 UI 状态
export const ui = reactive({
  now: new Date(),
  homeLeaving: false,
  linksLeaving: false,
  dropdownOpen: false, dropdownClosing: false, layoutEdit: false, preview: false,
  modal: null,                 // 'settings' | 'wallpaper' | 'about' | null
  searchQuery: '',
  searchFilter: '',
  flip: false,
  linkForm: { visible: false, closing: false, mode: 'add', id: null, url: '', name: '', batch: false, batchText: '', folderSel: '', newFolder: '', err: '', top: 0, left: 0, origin: '50% 50%' },
  ctxMenu: { visible: false, x: 0, y: 0, items: [], linkId: null, inFolder: false },
  confirm: { visible: false, title: '', desc: '', kind: null, linkId: null, folderId: null, dockId: null, presetId: null },
  folderOpenId: null,
  folderClosing: false,
  toast: { visible: false, msg: '', err: false },
  fontList: [],
  tourActive: false,              // 新手指引进行中
  tourRightClickEnter: false      // 引导期间：当前步骤是否允许右键空白进入链接页
})

/* ---------- toast ---------- */
let toastTimer = null
export function toast(msg, err) {
  ui.toast.msg = msg
  ui.toast.err = !!err
  ui.toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { ui.toast.visible = false }, 1800)
}

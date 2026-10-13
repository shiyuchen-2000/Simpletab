// ============================================================
// 壁纸文件夹轮换：导入 / 每次打开随机 / 定时轮换 / 手动换一张 / 清空
// 依赖：state/toast（state.js）、save（persistence.js）、wallpaperDB（壁纸索引）
// 注意：stopWallpaperRotate 为模块间内部接口（reset.js 调用），非公开 API
// ============================================================
import { state, toast } from './state'
import { save } from './persistence'
import { loadWallpaperBlob, saveFolderImage, loadFolderImage, clearFolderImages, kindOfBlob } from './wallpaperDB'

const WALLPAPER_MAX_DIM = 3840
function wphAsAlpha(ctx, w, h) {
  try {
    const d = ctx.getImageData(0, 0, w, h).data
    for (let i = 3; i < d.length; i += 4) { if (d[i] < 250) return true }
  } catch (e) { /* ignore */ }
  return false
}
/* 图片降采样：≤3840 原图直存；超大图 canvas 缩放到 3840 内（JPEG .9 / 透明图 PNG） */
async function normalizeFolderImage(file) {
  if (!/^image\//.test(file.type)) return null
  try {
    const bmp = await createImageBitmap(file)
    let blob
    if (Math.max(bmp.width, bmp.height) <= WALLPAPER_MAX_DIM) {
      blob = file
    } else {
      const scale = WALLPAPER_MAX_DIM / Math.max(bmp.width, bmp.height)
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bmp, 0, 0, w, h)
      blob = await new Promise(res => c.toBlob(res, wphAsAlpha(ctx, w, h) ? 'image/png' : 'image/jpeg', 0.9))
    }
    bmp.close && bmp.close()
    return blob || null
  } catch (e) { return null }
}
let wallpaperRotateTimer = null
export function stopWallpaperRotate() { if (wallpaperRotateTimer) { clearInterval(wallpaperRotateTimer); wallpaperRotateTimer = null } }
async function applyFolderWallpaper(i) {
  if (i < 0 || i >= state.wallpaperFolderCount) return
  const blob = await loadFolderImage(i).catch(() => null)
  if (!blob) return
  const old = state.wallpaper
  if (old && old.startsWith('blob:')) URL.revokeObjectURL(old)
  state.wallpaper = URL.createObjectURL(blob)
  state.wallpaperType = 'image'
  state.wallpaperFolderIndex = i
}
function startWallpaperRotate() {
  stopWallpaperRotate()
  if (state.wallpaperFolderMode !== 'timer' || state.wallpaperFolderCount < 2) return
  wallpaperRotateTimer = setInterval(() => {
    const n = state.wallpaperFolderCount
    applyFolderWallpaper(((state.wallpaperFolderIndex + 1) % n + n) % n)
  }, Math.max(1, state.wallpaperFolderInterval) * 60 * 1000)
}
/* 启动时调用（App onMounted）：按模式初始化壁纸 —— 每次打开随机一张；定时则应用当前张并开定时器 */
export function initWallpaperRotate() {
  if (!state.wallpaperFolderCount || !state.wallpaperFolderMode) return
  if (state.wallpaperFolderMode === 'timer') {
    applyFolderWallpaper(state.wallpaperFolderIndex >= 0 ? state.wallpaperFolderIndex : 0)
    startWallpaperRotate()
  } else {
    applyFolderWallpaper(Math.floor(Math.random() * state.wallpaperFolderCount))
  }
}
export function setWallpaperRotateMode(mode) {
  stopWallpaperRotate()
  state.wallpaperFolderMode = mode
  if (mode !== 'off' && state.wallpaperFolderCount) {
    applyFolderWallpaper(Math.floor(Math.random() * state.wallpaperFolderCount))
  }
  save()
  if (mode === 'timer') startWallpaperRotate()
}
export function setWallpaperRotateInterval(mins) {
  state.wallpaperFolderInterval = Math.max(1, +mins || 30)
  save(); startWallpaperRotate()
}
export function rotateWallpaperNow() {
  const n = state.wallpaperFolderCount
  if (!n) return
  applyFolderWallpaper(((state.wallpaperFolderIndex + 1) % n + n) % n)
}
/* 导入文件夹图片（File[]，过滤图片类型），存入 IndexedDB 并立即应用第一张 */
export async function importWallpaperFolder(files) {
  if (!files || !files.length) { toast('未选择图片', 'err'); return 0 }
  const saved = []
  for (let i = 0; i < files.length; i++) {
    const blob = await normalizeFolderImage(files[i])
    if (blob) { try { await saveFolderImage(blob, i) } catch (e) { continue } saved.push(i) }
  }
  if (!saved.length) { toast('未能读取文件夹中的图片', 'err'); return 0 }
  const oldCount = state.wallpaperFolderCount
  if (oldCount > saved.length) await clearFolderImages(saved.length, oldCount).catch(() => {})
  state.wallpaperFolderCount = saved.length
  if (!state.wallpaperFolderMode) state.wallpaperFolderMode = 'open'
  save()
  await applyFolderWallpaper(0)
  startWallpaperRotate()
  return saved.length
}
export async function clearWallpaperFolder() {
  stopWallpaperRotate()
  const n = state.wallpaperFolderCount
  if (n) await clearFolderImages(0, n).catch(() => {})
  const wasFolderActive = state.wallpaperFolderIndex >= 0
  state.wallpaperFolderCount = 0
  state.wallpaperFolderIndex = -1
  state.wallpaperFolderMode = null
  /* 仅当当前壁纸来自文件夹时才切换：清掉后恢复到之前的静态壁纸（IDB main）或默认，
     保证与刷新后 loadWallpaperBlob 的结果一致（不丢失此前单独上传的静态壁纸） */
  if (wasFolderActive && state.wallpaper && state.wallpaper.startsWith('blob:')) {
    URL.revokeObjectURL(state.wallpaper)
    state.wallpaper = null
    state.wallpaperType = null
    try {
      const blob = await loadWallpaperBlob()
      if (blob) {
        state.wallpaper = URL.createObjectURL(blob)
        state.wallpaperType = kindOfBlob(blob)
      }
    } catch (e) { /* ignore */ }
  }
  save()
}

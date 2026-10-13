// ============================================================
// 重置所有设置（保留 links/folders），并清掉 IndexedDB 壁纸
// 依赖：state/ui/DEFAULT_SETTINGS（state.js）、save（persistence.js）、
//       stopWallpaperRotate（wallpaper.js）、wallpaperDB（清壁纸）
// ============================================================
import { state, ui, DEFAULT_SETTINGS } from './state'
import { save } from './persistence'
import { stopWallpaperRotate } from './wallpaper'
import { clearWallpaperBlob, clearFolderImages } from './wallpaperDB'

export function resetSettings() {
  const oldWallpaper = state.wallpaper
  const oldType = state.wallpaperType
  const oldFolderCount = state.wallpaperFolderCount
  stopWallpaperRotate()
  Object.assign(state, {
    theme: DEFAULT_SETTINGS.theme, style: DEFAULT_SETTINGS.style, hour12: DEFAULT_SETTINGS.hour12,
    showSeconds: DEFAULT_SETTINGS.showSeconds, blink: DEFAULT_SETTINGS.blink,
    clockFont: DEFAULT_SETTINGS.clockFont, clockColor: DEFAULT_SETTINGS.clockColor,
    clockPos: DEFAULT_SETTINGS.clockPos, searchPos: DEFAULT_SETTINGS.searchPos, dockPos: DEFAULT_SETTINGS.dockPos, layoutCustom: DEFAULT_SETTINGS.layoutCustom,
    wallpaperFolderMode: DEFAULT_SETTINGS.wallpaperFolderMode, wallpaperFolderInterval: DEFAULT_SETTINGS.wallpaperFolderInterval,
    wallpaperFolderIndex: DEFAULT_SETTINGS.wallpaperFolderIndex, wallpaperFolderCount: DEFAULT_SETTINGS.wallpaperFolderCount, showDate: DEFAULT_SETTINGS.showDate,
    dateFormat: DEFAULT_SETTINGS.dateFormat, dateColor: DEFAULT_SETTINGS.dateColor, autoColor: DEFAULT_SETTINGS.autoColor,
    engine: DEFAULT_SETTINGS.engine, wallpaper: DEFAULT_SETTINGS.wallpaper, wallpaperType: DEFAULT_SETTINGS.wallpaperType,
    dockEnabled: DEFAULT_SETTINGS.dockEnabled, dockCount: DEFAULT_SETTINGS.dockCount,
    accentColor: DEFAULT_SETTINGS.accentColor,
    glassStrength: DEFAULT_SETTINGS.glassStrength, cardRadius: DEFAULT_SETTINGS.cardRadius, tileDensity: DEFAULT_SETTINGS.tileDensity, linkOpenIn: DEFAULT_SETTINGS.linkOpenIn, searchRadius: DEFAULT_SETTINGS.searchRadius,
    iconShape: DEFAULT_SETTINGS.iconShape, iconSize: DEFAULT_SETTINGS.iconSize, iconGlow: DEFAULT_SETTINGS.iconGlow, tileHoverLift: DEFAULT_SETTINGS.tileHoverLift, tileText: DEFAULT_SETTINGS.tileText, glassShine: DEFAULT_SETTINGS.glassShine, tileEnter: DEFAULT_SETTINGS.tileEnter, folderAnim: DEFAULT_SETTINGS.folderAnim,
    wallpaperVignette: DEFAULT_SETTINGS.wallpaperVignette,
    searchOpacity: DEFAULT_SETTINGS.searchOpacity, searchAnim: DEFAULT_SETTINGS.searchAnim, searchSwap: DEFAULT_SETTINGS.searchSwap, dockOpacity: DEFAULT_SETTINGS.dockOpacity, dockHoverLift: DEFAULT_SETTINGS.dockHoverLift, dockName: DEFAULT_SETTINGS.dockName
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
  if (oldFolderCount) clearFolderImages(0, oldFolderCount).catch(() => {})
  ui.searchFilter = ''
  save()
}

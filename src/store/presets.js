// ============================================================
// 自定义预设：保存当前设置为预设 / 删除预设
// 依赖：state（state.js）、uid（utils.js）、save（persistence.js）
// ============================================================
import { state } from './state'
import { uid } from './utils'
import { save } from './persistence'

/* 外观相关字段（保存当前设置为自定义预设） */
const PRESET_FIELDS = [
  'theme', 'style', 'accentColor', 'glassStrength', 'glassShine', 'cardRadius', 'tileDensity',
  'searchRadius', 'searchOpacity', 'searchSwap', 'dockOpacity', 'iconShape', 'iconSize', 'iconGlow', 'tileHoverLift',
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

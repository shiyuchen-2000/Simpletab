// ============================================================
// 外观预设：内置预设定义 + 应用 / 时间格式化
// 依赖：store（state / save / toast）
// ============================================================
import { state, save, toast } from '../store'

/* 外观预设：一键应用整套外观（不涉及链接/文件夹），应用后仍可展开逐项细调 */
export const PRESETS = [
  {
    id: 'pure', name: '纯净', desc: '克制安静 · 跟随系统 · 低动效',
    settings: {
      theme: 'system', style: 'glass', accentColor: null,
      glassStrength: null, glassShine: true, cardRadius: null,
      tileDensity: 'comfort', searchRadius: null, searchOpacity: 0.82, dockOpacity: 0.72,
      iconShape: 'rounded', iconSize: null, iconGlow: 50, tileHoverLift: 5, tileText: 'always',
      searchAnim: 'none', tileEnter: 'fade', folderAnim: 'normal'
    }
  },
  {
    id: 'glass', name: '质感', desc: '毛玻璃通透 · 圆润柔和',
    settings: {
      theme: 'dark', style: 'glass', accentColor: null,
      glassStrength: 0.45, glassShine: true, cardRadius: 24,
      tileDensity: 'comfort', searchRadius: 29, searchOpacity: 0.75, dockOpacity: 0.65,
      iconShape: 'rounded', iconSize: null, iconGlow: 60, tileHoverLift: 6, tileText: 'always',
      searchAnim: 'sink', tileEnter: 'drop', folderAnim: 'flip'
    }
  },
  {
    id: 'fluent', name: '现代', desc: 'Fluent 2 简洁 · 3D 动效',
    settings: {
      theme: 'dark', style: 'fluent', accentColor: null,
      glassStrength: null, glassShine: true, cardRadius: null,
      tileDensity: 'comfort', searchRadius: null, searchOpacity: 0.82, dockOpacity: 0.72,
      iconShape: 'rounded', iconSize: null, iconGlow: 40, tileHoverLift: 4, tileText: 'always',
      searchAnim: 'lift', tileEnter: 'drop', folderAnim: 'flip'
    }
  },
  {
    id: 'vivid', name: '灵动', desc: '动效全开 · 活泼有光',
    settings: {
      theme: 'dark', style: 'glass', accentColor: null,
      glassStrength: 0.4, glassShine: true, cardRadius: 28,
      tileDensity: 'spacious', searchRadius: 24, searchOpacity: 0.7, dockOpacity: 0.6,
      iconShape: 'squircle', iconSize: null, iconGlow: 80, tileHoverLift: 9, tileText: 'always',
      searchAnim: 'sink', tileEnter: 'drop', folderAnim: 'flip'
    }
  }
]
export function applyPreset(p) {
  Object.assign(state, p.settings)
  save()
  toast('已应用「' + p.name + '」外观预设')
}
/* 自定义预设保存时间格式化（列表副标题显示） */
export function presetTime(t) {
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

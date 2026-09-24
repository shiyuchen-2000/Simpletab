<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { state, ui, save, toast, fontStack, resetSettings, DEFAULT_SETTINGS, resolvedTheme, autoFitClockColors, saveCurrentAsPreset, setView, showConfirm } from '../store'
import { useGearModal } from '../store/useGearModal'

/* 每个设置行的标签与描述，用于搜索过滤。分组按「改哪块」分区，实时预览固定顶部不在此列 */
const GROUPS = computed(() => [
  {
    label: '外观预设',
    rows: [
      { id: 'presets', title: '外观预设', desc: '一键应用整套外观，之后可展开逐项微调', keywords: ['外观预设', '预设', '一键应用', '整套外观', 'preset', '外观'] }
    ]
  },
  {
    label: '页面布局',
    rows: [
      { id: 'pos', title: '时钟位置', desc: '预设摆放位置', keywords: ['时钟位置', '位置', 'top', 'mid', 'bottom', 'left', 'right'] },
      { id: 'searchPos', title: '搜索框位置', desc: '预设摆放位置', keywords: ['搜索框位置', '位置', '顶部', '中部', '底部', '左上', '右上', 'search', 'pos'] },
      { id: 'dockPos', title: '拓展坞位置', desc: '预设摆放位置', keywords: ['拓展坞位置', '位置', '顶部', '中部', '底部', '左上', '右上', 'dock', 'pos'] },
      { id: 'layout', title: '自定义页面布局', desc: '拖拽调整时钟 / 搜索框 / 拓展坞的位置与大小', keywords: ['自定义', '页面布局', '布局', '拖拽', '位置', '大小', '调整', 'layout'] }
    ]
  },
  {
    label: '主题',
    rows: [
      { id: 'theme', title: '外观', desc: '亮色 / 黑暗 / 跟随系统', keywords: ['外观', '主题', '亮色', '黑暗', '跟随系统', 'theme'] },
      { id: 'style', title: '风格', desc: '毛玻璃 / Fluent 2 设计风格，可随时切换', keywords: ['风格', '毛玻璃', 'Fluent', '设计', '微软', 'style'] },
      { id: 'accentColor', title: '主题色', desc: '自定义强调色，按钮 / 图标 / 文字自动适配', keywords: ['主题色', '强调色', '自定义颜色', '颜色', 'accent', 'color'] },
      { id: 'vignette', title: '壁纸暗角', desc: '在壁纸边缘添加黑色晕影，压暗壁纸', keywords: ['壁纸暗角', '暗角', '晕影', '压暗', 'vignette'] }
    ]
  },
  {
    label: '材质与质感',
    rows: [
      { id: 'glass', title: '毛玻璃强度', desc: '面板与卡片的透明程度', keywords: ['毛玻璃', '强度', '透明', 'glass', '模糊'] },
      { id: 'glassShine', title: '玻璃高光', desc: '在面板顶部添加高光反光边', keywords: ['玻璃高光', '高光', '反光', 'shine', '玻璃'] },
      { id: 'radius', title: '卡片圆角', desc: '磁贴与拓展坞的圆角大小', keywords: ['圆角', 'radius', '卡片'] }
    ]
  },
  {
    label: '时钟',
    rows: [
      { id: 'hour', title: '时间格式', desc: '12 小时 / 24 小时', keywords: ['时间格式', '12小时', '24小时', 'hour', 'format'] },
      { id: 'sec', title: '显示秒', desc: '在时间后显示秒数', keywords: ['显示秒', '秒', 'second'] },
      { id: 'blink', title: '分隔符闪烁', desc: '时间冒号每秒闪烁', keywords: ['分隔符', '闪烁', '冒号', 'blink'] },
      { id: 'clockColor', title: '时间颜色', desc: '自定义时钟文字颜色', keywords: ['时间颜色', '颜色', 'color'] },
      { id: 'date', title: '显示日期', desc: '在时间下方显示日期', keywords: ['显示日期', '日期', 'date'] },
      { id: 'dateFmt', title: '日期格式', desc: '日期显示样式', keywords: ['日期格式', '格式'] },
      { id: 'dateColor', title: '日期颜色', desc: '自定义日期文字颜色', keywords: ['日期颜色', '颜色'] },
      { id: 'autoColor', title: '自动适配颜色', desc: '根据壁纸自动匹配时间/日期颜色（主色+次色），开启后不可手动调色', keywords: ['自动适配', '壁纸', '颜色', '主色', 'auto'] },
      { id: 'font', title: '时钟字体', desc: '从系统字体库中选择', keywords: ['时钟字体', '字体', 'font'] }
    ]
  },
  {
    label: '磁贴设置',
    rows: [
      { id: 'density', title: '卡片密度', desc: '磁贴间距与大小', keywords: ['密度', '间距', '紧凑', '宽松', 'density'] },
      { id: 'iconShape', title: '图标形状', desc: '磁贴与拓展坞图标的形状', keywords: ['图标形状', '形状', '方形', '圆形', '半圆角', '圆角', 'icon', 'shape'] },
      { id: 'iconSize', title: '图标尺寸', desc: '图标大小，可手动覆盖卡片密度预设', keywords: ['图标尺寸', '图标大小', '大小', '尺寸', 'icon', 'size'] },
      { id: 'iconGlow', title: '图标光晕', desc: '图标底部光晕的强弱', keywords: ['图标光晕', '光晕', '阴影', '发光', 'glow'] },
      { id: 'tileText', title: '磁贴名称', desc: '始终显示 / 悬浮显示 / 不显示', keywords: ['磁贴名称', '名称', '文字', '隐藏', 'label', 'text'] },
      { id: 'tileHover', title: '悬浮动效', desc: '磁贴悬停上浮距离，调为 0 关闭', keywords: ['悬浮动效', '悬浮', '上浮', 'hover', '动效', '动画'] },
      { id: 'openIn', title: '打开方式', desc: '点击链接时在新标签页或当前页打开', keywords: ['打开方式', '新标签页', '当前页', '新开', 'open', 'tab'] },
      { id: 'tileEnter', title: '磁贴入场动画', desc: '进入链接页：整体淡入 / 依次落位', keywords: ['磁贴入场', '入场', '动画', '落位', '淡入', 'enter', 'tile'] },
      { id: 'folderAnim', title: '文件夹展开动画', desc: '打开文件夹：正常缩放 / 3D 翻转', keywords: ['文件夹', '展开', '动画', '翻转', '缩放', 'folder', 'anim'] }
    ]
  },
  {
    label: '搜索框',
    rows: [
      { id: 'searchOpacity', title: '搜索框透明度', desc: '调节搜索框背景的透明程度', keywords: ['搜索框透明度', '搜索框', '透明度', 'search', 'opacity'] },
      { id: 'searchRadius', title: '搜索框圆角', desc: '胶囊(29px)到方形(10px)之间调节，实时预览', keywords: ['搜索框圆角', '搜索框', '圆角', 'radius', '胶囊', '方形'] },
      { id: 'searchAnim', title: '搜索框动画', desc: '聚焦时的 3D 动效：无 / 沉入 / 浮升', keywords: ['搜索框动画', '动画', '3D', '沉入', '浮升', '动效', '效果', 'search', 'anim'] },
      { id: 'searchSwap', title: '交换位置', desc: '交换搜索引擎与搜索图标的位置', keywords: ['交换位置', '搜索引擎', '图标', '位置', 'swap', 'search'] },
    ]
  },
  {
    label: '捷径拓展坞',
    rows: [
      { id: 'dock', title: '显示拓展坞', desc: '在页面下侧显示快捷图标栏', keywords: ['显示拓展坞', '拓展坞', 'dock'] },
      { id: 'dockCount', title: '图标数量', desc: '拓展坞最多显示的图标数', keywords: ['图标数量', '拓展坞', '数量'] },
      { id: 'dockOpacity', title: '拓展坞透明度', desc: '调节拓展坞背景的透明程度', keywords: ['拓展坞透明度', '拓展坞', '透明度', 'dock', 'opacity'] },
    ]
  }
])

const keywordMatch = (row, q) => {
  const text = (row.title + row.desc + row.keywords.join(' ')).toLowerCase()
  return q.split(/\s+/).every(k => text.includes(k))
}
/* 常用项 = 外观 / 颜色 / 布局 / 磁贴名称；其余样式 / 行为设置归入「个性化」，点按钮展开 */
const BASIC_ROWS = new Set(['presets', 'theme', 'style', 'accentColor', 'clockColor', 'dateColor', 'autoColor', 'pos', 'searchPos', 'dockPos', 'layout', 'hour', 'density', 'iconSize', 'tileText'])
/* 外观预设：一键应用整套外观（不涉及链接/文件夹），应用后仍可展开逐项细调 */
const PRESETS = [
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
function applyPreset(p) {
  Object.assign(state, p.settings)
  save()
  toast('已应用「' + p.name + '」外观预设')
}

/* ---------- 自定义预设（右侧滑出面板，保存/删除，默认预设不可删） ---------- */
const presetPanelOpen = ref(false)
const findOpt = (arr, key) => { const x = arr.find(a => a[0] === key); return x ? x[1] : '' }
const presetPanelRows = computed(() => [
  { label: '外观', value: findOpt(themeOptions, state.theme) },
  { label: '风格', value: findOpt(styleOptions, state.style) },
  { label: '主题色', value: state.accentColor || '默认' },
  { label: '时间格式', value: state.hour12 ? '12 小时' : '24 小时' },
  { label: '时钟位置', value: findOpt(posOptions, state.clockPos) },
  { label: '日期格式', value: state.dateFormat === 'lunar' ? '农历' : findOpt(dateOptions, state.dateFormat) },
  { label: '卡片密度', value: findOpt(densityOptions, state.tileDensity) },
  { label: '图标形状', value: findOpt(shapeOptions, state.iconShape) },
  { label: '磁贴名称', value: findOpt(tileTextOptions, state.tileText) },
  { label: '搜索动画', value: findOpt(searchAnimOptions, state.searchAnim) },
  { label: '拓展坞', value: state.dockEnabled ? '显示' : '隐藏' }
])
const presetName = ref('')
const presetDesc = ref('')
function openPresetPanel() {
  presetName.value = '自定义' + (state.customPresets.length + 1)
  presetDesc.value = ''
  presetPanelOpen.value = true
}
const panelClosing = ref(false)
/* 关闭设置弹窗时，预设侧窗同步关闭 */
watch(() => ui.modal, v => { if (v !== 'settings') { presetPanelOpen.value = false; panelClosing.value = false } })
function closePresetPanel() {
  panelClosing.value = true
  /* 关闭：分条逐条收起（第一条先消失，依次收起），面板最后淡出 */
  const panel = document.querySelector('.preset-panel')
  if (panel) {
    const items = panel.querySelectorAll('.pp-item')
    items.forEach((el, i) => { el.style.animationDelay = (i * 45) + 'ms' })
  }
  setTimeout(() => { panelClosing.value = false; presetPanelOpen.value = false }, 760)
}
function savePreset() {
  saveCurrentAsPreset(presetName.value.trim() || '自定义' + (state.customPresets.length + 1), presetDesc.value.trim())
  presetPanelOpen.value = false
  toast('已保存为自定义预设')
}
function askDeletePreset(p) {
  ui.confirm.kind = 'preset'
  ui.confirm.presetId = p.id
  ui.confirm.title = '删除这个预设？'
  ui.confirm.desc = '删除后不可恢复'
  ui.confirm.visible = true
}
function presetTime(t) {
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
let initPersonalized = false
try { initPersonalized = localStorage.getItem('simpletab_personalized') === '1' } catch (e) { /* ignore */ }
const showPersonalized = ref(initPersonalized)
const smScrollRef = ref(null)
function togglePersonalized() {
  showPersonalized.value = !showPersonalized.value
  try { localStorage.setItem('simpletab_personalized', showPersonalized.value ? '1' : '0') } catch (e) { /* ignore */ }
  if (showPersonalized.value) {
    /* 展开后默认回到顶部，从「收起个性化」开始浏览全量设置 */
    nextTick(() => { if (smScrollRef.value) smScrollRef.value.scrollTop = 0 })
  }
}
const visibleRows = computed(() => {
  const q = ui.searchFilter.trim().toLowerCase()
  const all = GROUPS.value
  /* 搜索时全量匹配，绕过简单/个性化模式，避免搜不到 */
  if (q) return all.map(g => ({ label: g.label, rows: g.rows.filter(r => keywordMatch(r, q)) })).filter(g => g.rows.length > 0)
  /* 展开个性化：全量展示 */
  if (showPersonalized.value) return all.filter(g => g.rows.length > 0)
  /* 简单模式：只显示常用项（颜色 + 布局） */
  return all.map(g => ({ label: g.label, rows: g.rows.filter(r => BASIC_ROWS.has(r.id)) })).filter(g => g.rows.length > 0)
})

const hourOptions = [['12', '12 小时'], ['24', '24 小时']]
const posOptions = [['top', '顶部'], ['mid', '中部'], ['bottom', '底部'], ['left', '左上'], ['right', '右上']]
const themeOptions = [['light', '亮色'], ['dark', '黑暗'], ['system', '跟随系统']]
const styleOptions = [['glass', '毛玻璃'], ['fluent', 'Fluent 2'], ['borderless', '无界']]
const dateOptions = [
  ['cn-long', '2026年8月14日 星期五'],
  ['cn-short', '2026-08-14 周五'],
  ['en-long', 'Friday, Aug 14, 2026'],
  ['numeric', '08/14 周五'],
  ['weekday', '星期五'],
  ['lunar', '农历八月初七']
]
const dockCountOptions = [['3', '3'], ['5', '5'], ['7', '7']]
const shapeOptions = [['rounded', '圆角'], ['square', '方形'], ['squircle', '半圆角'], ['circle', '圆形']]
const tileTextOptions = [['always', '始终显示'], ['hover', '悬浮显示'], ['none', '不显示']]
/* 开关行字段映射（state 里的布尔字段名） */
const toggleField = { sec: 'showSeconds', blink: 'blink', date: 'showDate', dock: 'dockEnabled', vignette: 'wallpaperVignette', glassShine: 'glassShine', autoColor: 'autoColor', searchSwap: 'searchSwap' }
/* Fluent 风格下固定的材质类设置项：在 CSS [data-style="fluent"] 块中被 Fluent 规范值覆盖，故置灰不可调 */
const FIXED_ROWS = ['glass', 'glassShine', 'radius', 'searchOpacity', 'searchRadius', 'dockOpacity', 'iconGlow', 'tileHover']
const rowFixed = r => (state.style === 'fluent' || state.style === 'borderless') && FIXED_ROWS.includes(r.id)

const clockColorVal = computed(() => state.clockColor || (resolvedTheme.value === 'dark' ? '#f2fdfb' : '#0d2b2e'))
const dateColorVal = computed(() => state.dateColor || (resolvedTheme.value === 'dark' ? '#e9fbf9' : '#0d2b2e'))

/* 主题色：单一主色，按钮/图标/文字由 store 自动派生 */
const ACCENT_PRESETS = ['#39C5BB', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#22C55E', '#EF4444', '#64748B']
const accentColorVal = computed(() => state.accentColor || '#39C5BB')
function setAccentColor(c) {
  /* 选中默认青色 → 置 null，回落到 CSS 内置默认（保持出厂观感一致） */
  state.accentColor = String(c).toLowerCase() === '#39c5bb' ? null : c
  save()
}
function resetAccentColor() { state.accentColor = null; save(); toast('已恢复默认主题色') }

/* 布局微调：毛玻璃强度 / 卡片圆角 / 卡片密度 */
const engineName = computed(() => (state.engines.find(x => x.key === state.engine) || {}).name || '搜索')
const glassVal = computed(() => state.glassStrength ?? 0.5)
const radiusVal = computed(() => state.cardRadius ?? 19)
const searchRadiusVal = computed(() => state.searchRadius ?? 29)
const searchAnimOptions = [['none', '无'], ['sink', '沉入'], ['lift', '浮升']]
const tileEnterOptions = [['fade', '整体淡入'], ['drop', '依次落位']]
const folderAnimOptions = [['normal', '正常缩放'], ['flip', '3D翻转']]
const densityOptions = [['compact', '紧凑'], ['comfort', '舒适'], ['spacious', '宽松']]
function setGlass(v) { state.glassStrength = parseFloat(v); save() }
function setRadius(v) { state.cardRadius = parseInt(v, 10); save() }
function setSearchRadius(v) { state.searchRadius = parseInt(v, 10); save() }
function setSearchAnim(v) { state.searchAnim = v; save() }
function setTileEnter(v) { state.tileEnter = v; save() }
function setFolderAnim(v) { state.folderAnim = v; save() }
function setDensity(v) { state.tileDensity = v; save() }

/* 图标形状 / 尺寸 / 光晕 / 悬浮动效 / 磁贴名称 */
const iconSizeVal = computed(() => state.iconSize ?? 46)
function setIconShape(v) { state.iconShape = v; save() }
function setIconSize(v) { state.iconSize = parseInt(v, 10); save() }
function resetIconSize() { state.iconSize = null; save() }
function setIconGlow(v) { state.iconGlow = parseInt(v, 10); save() }
function setTileHover(v) { state.tileHoverLift = parseInt(v, 10); save() }
function setTileText(v) { state.tileText = v; save() }

/* 链接打开方式 */
const openInOptions = [['new', '新标签页'], ['self', '当前页']]
function setOpenIn(v) { state.linkOpenIn = v; save() }

function setHour(v) { state.hour12 = v === '12'; save() }
/* 自动适配开关：开启立即重算并锁定手动调色；关闭恢复主题默认色 */
const colorAutoFixed = r => state.autoColor && (r.id === 'clockColor' || r.id === 'dateColor')
/* 切换位置预设：清除对应元素的自定义坐标（保留大小/宽度），使预设立即生效 */
function clearCustomPos(kind) {
  const c = state.layoutCustom
  if (!c || !c[kind]) return
  delete c[kind].x
  delete c[kind].y
  if (!Object.keys(c[kind]).length) delete c[kind]
  if (!Object.keys(c).length) state.layoutCustom = null
}
function setClockPos(v) { state.clockPos = v; clearCustomPos('clock'); save() }
function setSearchPos(v) { state.searchPos = v; clearCustomPos('search'); save() }
function setDockPos(v) { state.dockPos = v; clearCustomPos('dock'); save() }
/* 进入页面布局全屏编辑器 */
function openLayoutEditor() {
  closeModal()
  ui.layoutEdit = true
  setView('home')   // 布局元素主要在主页显示，编辑器打开时切到主页便于拖拽预览
}
/* 重置页面布局：二次确认后恢复默认居中预设 */
function askResetLayout() {
  showConfirm('layoutReset', null, null, null, '重置页面布局？', '将清除自定义调整，恢复默认位置（时钟顶 / 搜索框中 / 拓展坞底）')
}
/* 实时预览：关闭设置弹窗进入真实页面（仅可切换视图/打开文件夹，不可访问链接/打开设置） */
function openPreview() {
  closeModal()
  ui.preview = true
  setView('home')
}
function setTheme(v) { state.theme = v; save() }
function setStyle(v) { state.style = v; save() }
function setDateFormat(v) { state.dateFormat = v; save() }
function setDockCount(v) { state.dockCount = parseInt(v, 10); save() }
function toggle(field) {
  state[field] = !state[field]
  if (field === 'autoColor') {
    if (state.autoColor) autoFitClockColors()
    else { state.clockColor = null; state.dateColor = null }
  }
  save()
}
function isDefault() {
  return Object.keys(DEFAULT_SETTINGS).every(k => state[k] === DEFAULT_SETTINGS[k])
}
function onReset() {
  if (!isDefault()) {
    ui.confirm.kind = 'reset'
    ui.confirm.title = '重置所有设置？'
    ui.confirm.desc = '将恢复为默认值（快捷链接与文件夹不受影响）'
    ui.confirm.visible = true
  } else {
    toast('当前已是默认设置')
  }
}

/* 左侧悬浮目录：当前分组 / 点击快速定位 / 滚动联动高亮 */
const activeGroup = ref('')
let navJumping = false, navJumpTimer = null   // 点击跳转动画期间锁定高亮，避免滚动联动中途覆盖
function scrollToGroup(label) {
  const sc = smScrollRef.value
  if (!sc) return
  const el = Array.from(sc.querySelectorAll('.set-group')).find(g => g.dataset.group === label)
  if (!el) return
  navJumping = true
  const top = Math.max(0, el.offsetTop - sc.offsetTop - 10)
  sc.scrollTop = top
  activeGroup.value = label
  clearTimeout(navJumpTimer)
  navJumpTimer = setTimeout(() => { navJumping = false }, 600)
}
function onScrollNav() {
  if (navJumping) return
  const sc = smScrollRef.value
  if (!sc) return
  const groups = Array.from(sc.querySelectorAll('.set-group[data-group]'))
  if (!groups.length) return
  /* 滚动到底：高亮最后一个分组 */
  if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) {
    activeGroup.value = groups[groups.length - 1].dataset.group
    return
  }
  /* 常规：高亮可视区顶部所在的分组 */
  const scTop = sc.getBoundingClientRect().top
  let current = groups[0].dataset.group
  for (const g of groups) {
    if (g.getBoundingClientRect().top <= scTop + 8) current = g.dataset.group
  }
  activeGroup.value = current
}

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('settings')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'settings' && !closing, closing }" @click.self="closeModal">
    <div class="sm-wrap">
      <nav class="set-nav">
        <button v-for="g in visibleRows" :key="'nav-' + g.label" type="button" :class="{ on: activeGroup === g.label }" @click="scrollToGroup(g.label)">{{ g.label }}</button>
      </nav>
      <div class="modal settings-modal" ref="modalRef" :style="{ transformOrigin: modalOrigin }">
        <div class="m-head">
          <span class="m-title">常规设置</span>
          <button class="m-close" @click="closeModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>

      <!-- 设置搜索栏：输入即过滤，无按钮 -->
      <div class="set-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="搜索设置…" v-model="ui.searchFilter" autocomplete="off" spellcheck="false">
        <button v-if="ui.searchFilter" class="set-search-clear" @click.stop="ui.searchFilter = ''"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <!-- 实时预览：进入真实页面查看效果 -->
      <button class="preview-entry" @click="openPreview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        实时预览
        <em>进入页面查看真实效果</em>
      </button>

      <!-- 设置列表：独立滚动 -->
      <div class="sm-scroll" ref="smScrollRef" @scroll="onScrollNav">
      <!-- 收起个性化：展开态置顶，随时可收起 -->
      <Transition name="pg">
        <button v-if="showPersonalized && !ui.searchFilter" class="personalize-btn" @click.stop="togglePersonalized">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
          收起个性化
        </button>
      </Transition>
      <!-- 分组渲染，按搜索过滤（展开 / 收起带过渡） -->
      <TransitionGroup name="pg" tag="div">
        <div v-for="g in visibleRows" :key="g.label" class="set-group" :data-group="g.label" :class="{ 'set-group-first': g === visibleRows[0] }">
          <div class="set-label">{{ g.label }}</div>

          <template v-for="r in g.rows" :key="r.id">
            <!-- 外观预设：一键应用整套外观 -->
            <div v-if="r.id === 'presets'" class="preset-box" style="margin-top:.4rem;">
              <div class="preset-list">
                <button v-for="p in PRESETS" :key="p.id" class="preset-card" @click="applyPreset(p)">
                  <span class="preset-name">{{ p.name }}</span>
                  <span class="preset-desc">{{ p.desc }}</span>
                </button>
                <div v-for="(p, i) in state.customPresets" :key="p.id" class="preset-card cp" @click="applyPreset({ name: p.name || '自定义' + (i + 1), settings: p.settings })">
                  <span class="preset-name">{{ p.name || '自定义' + (i + 1) }}</span>
                  <span class="preset-desc">{{ p.desc || presetTime(p.time) }}</span>
                  <button class="pd-del" title="删除预设" @click.stop="askDeletePreset(p)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <button class="preset-add" @click="openPresetPanel">+ 添加现有设置到预设</button>
            </div>
            <!-- 时钟：时间格式 -->
            <div v-else-if="r.id === 'hour'" class="set-row">
              <div><div class="r-t">时间格式</div><div class="r-d">12 小时 / 24 小时</div></div>
              <div class="seg">
                <button v-for="[v, label] in hourOptions" :key="v" :class="{ on: (state.hour12 ? '12' : '24') === v }" @click="setHour(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 时钟：位置 -->
            <div v-else-if="r.id === 'pos'" class="set-row">
              <div><div class="r-t">时钟位置</div><div class="r-d">预设摆放位置</div></div>
              <div class="seg">
                <button v-for="[v, label] in posOptions" :key="v" :class="{ on: state.clockPos === v }" @click="setClockPos(v)">{{ label }}</button>
              </div>
            </div>
            <div v-else-if="r.id === 'searchPos'" class="set-row">
              <div><div class="r-t">搜索框位置</div><div class="r-d">预设摆放位置</div></div>
              <div class="seg">
                <button v-for="[v, label] in posOptions" :key="v" :class="{ on: state.searchPos === v }" @click="setSearchPos(v)">{{ label }}</button>
              </div>
            </div>
            <div v-else-if="r.id === 'dockPos'" class="set-row">
              <div><div class="r-t">拓展坞位置</div><div class="r-d">预设摆放位置</div></div>
              <div class="seg">
                <button v-for="[v, label] in posOptions" :key="v" :class="{ on: state.dockPos === v }" @click="setDockPos(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 自定义页面布局：进入全屏拖拽调整 -->
            <div v-else-if="r.id === 'layout'" class="set-row">
              <div><div class="r-t">自定义页面布局 <span class="layout-warn">元素可能存在遮挡，请自行调整</span></div><div class="r-d">拖拽时钟 / 搜索框 / 拓展坞，调整位置与大小</div></div>
              <div class="layout-actions">
                <button class="btn btn-ghost" @click="askResetLayout">重置布局</button>
                <button class="btn btn-primary" @click="openLayoutEditor">调整布局</button>
              </div>
            </div>
            <!-- 开关行 -->
            <div v-else-if="toggleField[r.id]" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <button class="switch" :class="{ on: state[toggleField[r.id]] }" :disabled="rowFixed(r)" @click="toggle(toggleField[r.id])"></button>
            </div>
            <!-- 日期格式 -->
            <div v-else-if="r.id === 'dateFmt'" class="set-row">
              <div><div class="r-t">日期格式</div><div class="r-d">日期显示样式</div></div>
              <div class="seg" id="segDateFmt">
                <button v-for="[v, label] in dateOptions" :key="v" :class="{ on: state.dateFormat === v }" @click="setDateFormat(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 颜色行 -->
            <div v-else-if="['clockColor','dateColor'].includes(r.id)" class="set-row" :class="{ fixed: colorAutoFixed(r) }">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <div class="color-row">
                <input type="color" :disabled="colorAutoFixed(r)" :value="r.id === 'clockColor' ? clockColorVal : dateColorVal"
                       @input="e => { state[r.id === 'clockColor' ? 'clockColor' : 'dateColor'] = e.target.value; save() }">
                <button class="btn-mini" :disabled="colorAutoFixed(r)" @click="() => { state[r.id === 'clockColor' ? 'clockColor' : 'dateColor'] = null; save(); toast('已恢复默认' + (r.id === 'clockColor' ? '时间' : '日期') + '颜色') }">默认</button>
              </div>
            </div>
            <!-- 透明度滑块 -->
            <div v-else-if="['searchOpacity','dockOpacity'].includes(r.id)" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <div class="opacity-row">
                <input type="range" min="0.3" max="0.95" step="0.01" :disabled="rowFixed(r)"
                       :value="state[r.id]" @input="e => { state[r.id] = parseFloat(e.target.value); save() }">
                <span class="opacity-val">{{ Math.round(state[r.id] * 100) }}%</span>
              </div>
            </div>
            <!-- 搜索框圆角 -->
            <div v-else-if="r.id === 'searchRadius'" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">搜索框圆角</div><div class="r-d">胶囊(29px)到方形(10px)之间调节，实时预览</div></div>
              <div class="opacity-row">
                <input type="range" min="10" max="29" step="1" :disabled="rowFixed(r)" :value="searchRadiusVal" @input="e => setSearchRadius(e.target.value)">
                <span class="opacity-val">{{ searchRadiusVal }}px</span>
              </div>
            </div>
            <!-- 搜索框动画 -->
            <div v-else-if="r.id === 'searchAnim'" class="set-row">
              <div><div class="r-t">搜索框动画</div><div class="r-d">聚焦时的 3D 动效：无 / 沉入 / 浮升</div></div>
              <div class="seg">
                <button v-for="[v, label] in searchAnimOptions" :key="v" :class="{ on: state.searchAnim === v }" @click="setSearchAnim(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 字体 -->
            <div v-else-if="r.id === 'font'" class="set-group" style="margin-top:0;">
              <div class="set-row" style="align-items:flex-start;">
                <div style="padding-top:4px;"><div class="r-t">时钟字体</div><div class="r-d">从系统字体库中选择</div></div>
              </div>
              <div class="font-picker" id="fontPicker">
                <button v-for="f in ui.fontList" :key="f" class="font-item" :class="{ on: state.clockFont === f }"
                        :style="{ fontFamily: fontStack(f) }"
                        @click="() => { state.clockFont = f; save(); toast('时钟字体已切换') }">
                  <span class="fi-preview">12:34</span>
                  <span class="fi-name">{{ f }}</span>
                  <span class="fi-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
                </button>
              </div>
            </div>
            <!-- 主题 -->
            <div v-else-if="r.id === 'theme'" class="set-row">
              <div><div class="r-t">外观</div><div class="r-d">亮色 / 黑暗 / 跟随系统</div></div>
              <div class="seg">
                <button v-for="[v, label] in themeOptions" :key="v" :class="{ on: state.theme === v }" @click="setTheme(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 风格 -->
            <div v-else-if="r.id === 'style'" class="set-row">
              <div><div class="r-t">风格</div><div class="r-d">毛玻璃 / Fluent 2，可随时切换</div></div>
              <div class="seg">
                <button v-for="[v, label] in styleOptions" :key="v" :class="{ on: state.style === v }" @click="setStyle(v)">{{ label }}</button>
              </div>
            </div>
            <!-- Fluent 风格提示：独立整行，避免长文字挤压 seg 控件宽度导致换行错位 -->
            <p v-else-if="r.id === 'style' && state.style === 'fluent'" class="style-hint">Fluent 风格下，材质与质感设置将固定为 Fluent 规范值（置灰不可调）</p>
            <p v-else-if="r.id === 'style' && state.style === 'borderless'" class="style-hint">无界风格下，卡片与毛玻璃将隐藏，仅保留图标与名称（相关材质设置置灰不可调）</p>
            <!-- 主题色 -->
            <div v-else-if="r.id === 'accentColor'" class="set-row" style="align-items:flex-start;">
              <div><div class="r-t">主题色</div><div class="r-d">自定义强调色，按钮 / 图标 / 文字自动适配</div></div>
              <div class="accent-box">
                <div class="accent-swatches">
                  <button v-for="c in ACCENT_PRESETS" :key="c" class="accent-swatch"
                          :class="{ on: accentColorVal.toLowerCase() === c.toLowerCase() }"
                          :style="{ background: c }" :title="c" @click="setAccentColor(c)"></button>
                </div>
                <div class="color-row">
                  <input type="color" :value="accentColorVal" @input="e => setAccentColor(e.target.value)">
                  <button class="btn-mini" @click="resetAccentColor">默认</button>
                </div>
              </div>
            </div>
            <!-- 毛玻璃强度 -->
            <div v-else-if="r.id === 'glass'" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">毛玻璃强度</div><div class="r-d">面板与卡片的透明程度</div></div>
              <div class="opacity-row">
                <input type="range" min="0.15" max="0.85" step="0.01" :disabled="rowFixed(r)" :value="glassVal" @input="e => setGlass(e.target.value)">
                <span class="opacity-val">{{ Math.round(glassVal * 100) }}%</span>
              </div>
            </div>
            <!-- 卡片圆角 -->
            <div v-else-if="r.id === 'radius'" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">卡片圆角</div><div class="r-d">磁贴与拓展坞的圆角大小</div></div>
              <div class="opacity-row">
                <input type="range" min="8" max="30" step="1" :disabled="rowFixed(r)" :value="radiusVal" @input="e => setRadius(e.target.value)">
                <span class="opacity-val">{{ radiusVal }}px</span>
              </div>
            </div>
            <!-- 卡片密度 -->
            <div v-else-if="r.id === 'density'" class="set-row">
              <div><div class="r-t">卡片密度</div><div class="r-d">磁贴间距与大小</div></div>
              <div class="seg">
                <button v-for="[v, label] in densityOptions" :key="v" :class="{ on: state.tileDensity === v }" @click="setDensity(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 图标形状 -->
            <div v-else-if="r.id === 'iconShape'" class="set-row">
              <div><div class="r-t">图标形状</div><div class="r-d">磁贴与拓展坞图标的形状</div></div>
              <div class="seg">
                <button v-for="[v, label] in shapeOptions" :key="v" :class="{ on: state.iconShape === v }" @click="setIconShape(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 图标尺寸 -->
            <div v-else-if="r.id === 'iconSize'" class="set-row">
              <div><div class="r-t">图标尺寸</div><div class="r-d">可手动覆盖卡片密度预设</div></div>
              <div class="opacity-row">
                <input type="range" min="28" max="64" step="2" :value="iconSizeVal" @input="e => setIconSize(e.target.value)">
                <span class="opacity-val">{{ iconSizeVal }}px</span>
                <button class="btn-mini" :class="{ on: state.iconSize == null }" @click="resetIconSize" title="恢复为跟随卡片密度">自动</button>
              </div>
            </div>
            <!-- 图标光晕 -->
            <div v-else-if="r.id === 'iconGlow'" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">图标光晕</div><div class="r-d">图标底部光晕的强弱</div></div>
              <div class="opacity-row">
                <input type="range" min="0" max="100" step="1" :disabled="rowFixed(r)" :value="state.iconGlow" @input="e => setIconGlow(e.target.value)">
                <span class="opacity-val">{{ state.iconGlow }}%</span>
              </div>
            </div>
            <!-- 悬浮动效 -->
            <div v-else-if="r.id === 'tileHover'" class="set-row" :class="{ fixed: rowFixed(r) }">
              <div><div class="r-t">悬浮动效</div><div class="r-d">悬停上浮距离，0 关闭</div></div>
              <div class="opacity-row">
                <input type="range" min="0" max="12" step="1" :disabled="rowFixed(r)" :value="state.tileHoverLift" @input="e => setTileHover(e.target.value)">
                <span class="opacity-val">{{ state.tileHoverLift }}px</span>
              </div>
            </div>
            <!-- 磁贴名称 -->
            <div v-else-if="r.id === 'tileText'" class="set-row">
              <div><div class="r-t">磁贴名称</div><div class="r-d">始终显示 / 悬浮显示 / 不显示</div></div>
              <div class="seg">
                <button v-for="[v, label] in tileTextOptions" :key="v" :class="{ on: state.tileText === v }" @click="setTileText(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 图标数量 -->
            <div v-else-if="r.id === 'dockCount'" class="set-row">
              <div><div class="r-t">图标数量</div><div class="r-d">拓展坞最多显示的图标数</div></div>
              <div class="seg">
                <button v-for="[v, label] in dockCountOptions" :key="v" :class="{ on: String(state.dockCount) === v }" @click="setDockCount(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 打开方式 -->
            <div v-else-if="r.id === 'openIn'" class="set-row">
              <div><div class="r-t">打开方式</div><div class="r-d">点击链接时在新标签页或当前页打开</div></div>
              <div class="seg">
                <button v-for="[v, label] in openInOptions" :key="v" :class="{ on: state.linkOpenIn === v }" @click="setOpenIn(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 磁贴入场动画 -->
            <div v-else-if="r.id === 'tileEnter'" class="set-row">
              <div><div class="r-t">磁贴入场动画</div><div class="r-d">进入链接页：整体淡入 / 依次落位</div></div>
              <div class="seg">
                <button v-for="[v, label] in tileEnterOptions" :key="v" :class="{ on: state.tileEnter === v }" @click="setTileEnter(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 文件夹展开动画 -->
            <div v-else-if="r.id === 'folderAnim'" class="set-row">
              <div><div class="r-t">文件夹展开动画</div><div class="r-d">打开文件夹：正常缩放 / 3D 翻转</div></div>
              <div class="seg">
                <button v-for="[v, label] in folderAnimOptions" :key="v" :class="{ on: state.folderAnim === v }" @click="setFolderAnim(v)">{{ label }}</button>
              </div>
            </div>
          </template>
        </div>
      </TransitionGroup>

      <!-- 无匹配结果 -->
      <div v-if="visibleRows.length === 0" class="set-empty">
        未找到匹配的设置项
      </div>

      <!-- 展开个性化：列表末尾内联入口 -->
      <Transition name="pg">
        <button v-if="!showPersonalized && !ui.searchFilter" class="personalize-btn" @click.stop="togglePersonalized">
          个性化设置
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </Transition>

      <!-- 重置所有设置 -->
      <div class="set-group" style="margin-top:1.5rem;padding-top:1.3rem;border-top:1px solid var(--glass-border);">
        <button class="btn btn-danger" style="width:100%;justify-content:center;" @click="onReset">
          重置所有设置
        </button>
      </div>
      </div><!-- /sm-scroll -->
      </div><!-- /modal -->

      <!-- 自定义预设：右侧滑出面板（透明无边框，分条动画加载） -->
      <div class="preset-panel" v-if="presetPanelOpen" :class="{ closing: panelClosing }">
        <div class="pp-head">
          <span class="pp-title">当前设置</span>
          <button class="pp-close" title="关闭" @click="closePresetPanel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </div>
        <div class="pp-fields">
          <input v-model="presetName" class="pp-input" placeholder="预设名称" maxlength="20" spellcheck="false">
          <input v-model="presetDesc" class="pp-input" placeholder="预设描述（可选）" maxlength="40" spellcheck="false">
        </div>
        <div class="pp-list">
          <div v-for="(it, idx) in presetPanelRows" :key="it.label" class="pp-item" :style="{ animationDelay: (idx * 70) + 'ms' }">
            <span>{{ it.label }}</span><b>{{ it.value }}</b>
          </div>
        </div>
        <div class="pp-save">
          <button class="btn btn-primary" @click="savePreset">保存当前预设</button>
        </div>
      </div>
    </div><!-- /sm-wrap -->
  </div>
</template>

<style scoped>
/* 左侧悬浮目录：位于弹窗外部左侧，无背景纯文字 */
.sm-wrap{position:relative;display:flex;perspective:900px;}
.settings-modal{display:flex;flex-direction:column;overflow:hidden;scroll-behavior:smooth;}
.sm-scroll{flex:1;min-height:0;overflow-y:auto;scroll-behavior:smooth;}
.set-nav{position:absolute;left:-124px;top:50%;transform:translateY(-50%);width:96px;display:flex;flex-direction:column;gap:20px;transition:transform .5s var(--ease);}
/* 仅关闭按钮 hover 时目录沿 Z 轴上浮，离开落位；hover 目录本身/弹窗其他区域不触发，保证点击稳定；
   节奏与弹窗 3D 动画联动（进入快 / 恢复舒缓） */
.sm-wrap:has(.m-close:hover) .set-nav{transition:transform .3s var(--ease);transform:translateY(-50%) translateZ(20px);}
.set-nav button{display:flex;align-items:center;justify-content:flex-end;gap:8px;border:none;background:none;text-align:right;padding:12px 6px;margin:-12px -6px;font-size:14px;color:var(--text-faint);cursor:pointer;white-space:nowrap;overflow:hidden;transition:color .2s;}
.set-nav button::after{content:"";width:16px;height:1px;background:currentColor;opacity:.4;transition:width .2s var(--ease),opacity .2s;}
.set-nav button:hover{color:var(--accent-text);}
.set-nav button:hover::after,.set-nav button.on::after{width:22px;opacity:1;}
.set-nav button.on{color:var(--accent-text);font-weight:600;}
/* 亮色模式：目录文字用白色（带深色投影保证对比可读） */
[data-theme="light"] .set-nav button{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35);}
[data-theme="light"] .set-nav button:hover,[data-theme="light"] .set-nav button.on{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.45);}
@media (max-width:760px){.set-nav{display:none;}}
.set-search{
  display:flex;align-items:center;gap:.5rem;
  padding:.5rem .8rem;border-radius:12px;margin-bottom:.5rem;
  background:var(--glass-soft);border:1px solid var(--glass-border);
}
.set-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-size:.9rem;color:var(--text);}
.set-search input::placeholder{color:var(--text-faint);}
.set-search-clear{flex:none;color:var(--text-faint);width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.85rem;}
.set-search-clear:hover{background:var(--glass-strong);color:var(--text);}
.opacity-row{display:flex;align-items:center;gap:.5rem;}
.opacity-row input[type="range"]{width:110px;accent-color:var(--accent);}
.opacity-val{font-size:.8rem;color:var(--accent-text);min-width:38px;text-align:right;font-variant-numeric:tabular-nums;}
.btn-mini.on{background:var(--accent);color:var(--accent-on);font-weight:600;}
/* 个性化展开 / 收起入口：内联在列表里，虚线弱化，hover 主题色 */
.personalize-btn{
  width:100%;display:flex;align-items:center;justify-content:center;gap:.4rem;
  margin-top:.9rem;padding:.62rem;border-radius:11px;font-size:.86rem;color:var(--accent-text);
  background:var(--glass-soft);border:1px dashed var(--glass-border);
  transition:background .2s,color .2s,border-color .2s;
}
.personalize-btn:hover{background:rgba(var(--accent-rgb),.12);border-color:rgba(var(--accent-rgb),.5);color:var(--accent);}
.personalize-btn svg{opacity:.75;}
/* 个性化展开 / 收起过渡：分组与按钮淡入淡出 + 上下位移 + 重排平滑 */
.pg-enter-active,.pg-leave-active{transition:opacity .28s var(--ease),transform .28s var(--ease);}
.pg-enter-from{opacity:0;transform:translateY(-10px);}
.pg-leave-to{opacity:0;transform:translateY(6px);}
.pg-move{transition:transform .28s var(--ease);}
.accent-box{display:flex;flex-direction:column;align-items:flex-end;gap:.55rem;}
.accent-swatches{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:248px;}
.accent-swatch{width:22px;height:22px;border-radius:7px;flex:none;cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s;}
.accent-swatch:hover{transform:scale(1.15);box-shadow:0 3px 8px rgba(0,0,0,.25);}
.accent-swatch.on{outline:2px solid var(--text);outline-offset:2px;}
.set-empty{text-align:center;color:var(--text-faint);font-size:.85rem;padding:1.5rem 0;}
/* Fluent 风格提示：独立整行，不挤压 seg 控件宽度 */
.style-hint{font-size:.76rem;color:var(--text-faint);line-height:1.5;padding:.35rem .2rem .5rem;border-top:1px dashed var(--glass-border);}
/* 外观预设：折叠状态顶部的一键应用卡片 */
.preset-box{margin-bottom:1.4rem;}
.preset-hint{font-size:.76rem;color:var(--text-faint);margin:-.35rem 0 .6rem;}
.preset-list{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}
.preset-card{
  display:flex;flex-direction:column;align-items:flex-start;gap:.15rem;
  padding:.6rem .75rem;border-radius:12px;text-align:left;cursor:pointer;
  background:var(--glass-soft);border:1px solid var(--glass-border);
  transition:background .2s,transform .2s var(--ease),border-color .2s;
}
.preset-card:hover{background:rgba(var(--accent-rgb),.12);border-color:rgba(var(--accent-rgb),.5);transform:translateY(-1px);}
.preset-name{font-size:.88rem;font-weight:600;color:var(--text);}
.preset-desc{font-size:.72rem;color:var(--text-faint);line-height:1.35;}
/* 自定义预设：删除按钮（hover 浮现，二次确认后删除） */
.preset-card.cp{position:relative;cursor:pointer;}
.preset-card .pd-del{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;color:#ff8a94;background:rgba(231,76,86,.1);border:none;cursor:pointer;opacity:0;transition:opacity .2s;}
.preset-card:hover .pd-del{opacity:1;}
.preset-card .pd-del:hover{background:rgba(231,76,86,.22);}
.preset-add{margin-top:.8rem;width:100%;padding:.6rem;border-radius:11px;font-size:.86rem;color:var(--accent-text);background:var(--glass-soft);border:1px dashed var(--glass-border);cursor:pointer;transition:background .2s,border-color .2s;}
.preset-add:hover{background:rgba(var(--accent-rgb),.12);border-color:rgba(var(--accent-rgb),.5);}
/* 页面布局调整提示：红色弱提示，提醒元素可能存在遮挡 */
.layout-warn{font-size:.68rem;font-weight:400;color:#ff8a94;margin-left:.4rem;vertical-align:1px;}
.layout-actions{display:flex;align-items:center;gap:.5rem;flex:none;}
/* 实时预览入口 */
.preview-entry{display:flex;align-items:center;gap:10px;width:100%;padding:.7rem .8rem;margin-bottom:.9rem;border-radius:12px;
  font-size:.88rem;font-weight:600;color:var(--accent-text);cursor:pointer;text-align:left;
  background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.3);transition:background .2s,border-color .2s;}
.preview-entry:hover{background:rgba(var(--accent-rgb),.18);border-color:rgba(var(--accent-rgb),.55);}
.preview-entry svg{flex:none;}
.preview-entry em{font-style:normal;font-weight:400;font-size:.72rem;color:var(--text-faint);margin-left:auto;letter-spacing:.02em;}

/* 右侧面板：透明无边框，内容分条动画加载 */
.preset-panel{position:absolute;left:calc(100% + 20px);top:0;bottom:0;width:250px;z-index:5;display:flex;flex-direction:column;pointer-events:auto;transition:transform .3s var(--ease);}
/* 主面板关闭按钮 hover：预设侧拉栏沿 Z 轴上浮（与左侧目录联动一致） */
.sm-wrap:has(.m-close:hover) .preset-panel{transform:translateZ(24px);}
.pp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;}
.pp-title{font-size:.78rem;letter-spacing:.14em;color:var(--text-faint);}
.pp-fields{display:flex;flex-direction:column;gap:8px;margin-bottom:.7rem;}
.pp-input{width:100%;padding:.5rem .7rem;border-radius:10px;font-size:.85rem;color:var(--text);background:var(--glass-soft);border:1px solid var(--glass-border);outline:none;transition:border-color .2s;box-sizing:border-box;}
.pp-input:focus{border-color:rgba(var(--accent-rgb),.55);}
.pp-input::placeholder{color:var(--text-faint);}
.pp-close{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--text-dim);background:rgba(255,255,255,.06);border:none;cursor:pointer;transition:background .2s,color .2s,transform .2s;}
.pp-close:hover{background:rgba(231,76,86,.15);color:#ff8a94;transform:scale(1.06);}
/* 点击关闭：分条逐条收起（淡出 + 微缩），面板最后整体淡出 */
.preset-panel.closing{animation:ppOutPanel .2s var(--ease) .6s forwards;}
@keyframes ppOutPanel{to{opacity:0}}
.preset-panel.closing .pp-item{animation:ppOutItem .18s var(--ease) backwards;}
@keyframes ppOutItem{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-14px)}}
.pp-item{display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;font-size:.85rem;color:var(--text);opacity:0;animation:ppIn .35s var(--ease) forwards;}
.pp-item span{color:var(--text-dim);}
.pp-item b{font-weight:600;color:var(--accent-text);max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* 分条从左到右逐条展示（从左侧滑入，不经过 modal 右缘，避免边缘光晕） */
@keyframes ppIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
.pp-save{padding-top:1rem;}
.pp-save .btn{width:100%;justify-content:center;}
/* 亮色模式：侧拉面板文字用白色（面板为透明底） */
[data-theme="light"] .preset-panel .pp-title{color:rgba(255,255,255,.78);}
[data-theme="light"] .preset-panel .pp-item{color:#fff;}
[data-theme="light"] .preset-panel .pp-item span{color:rgba(255,255,255,.88);}
[data-theme="light"] .preset-panel .pp-item b{color:#fff;}
[data-theme="light"] .preset-panel .pp-input{color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.22);}
[data-theme="light"] .preset-panel .pp-input::placeholder{color:rgba(255,255,255,.55);}
/* 侧面板打开时：设置弹窗右侧边框泛主题色光晕 */
.sm-wrap:has(.preset-panel) .settings-modal{box-shadow:0 24px 70px rgba(0,0,0,.4), 10px 0 34px rgba(var(--accent-rgb),.32);}
/* Fluent 风格下材质类设置固定：置灰不可交互 */
.set-row.fixed{opacity:.5;}
.set-row.fixed input[type="range"],.set-row.fixed input[type="color"],.set-row.fixed .switch,.set-row.fixed .btn-mini{cursor:not-allowed;}
</style>

// ============================================================
// 设置弹窗配置：分组声明 / 选项枚举 / 开关字段映射 / 置灰规则（纯数据）
// 供 SettingsModal 与 settings/ 下的行组件共用
// ============================================================

/* 每个设置行的标签与描述，用于搜索过滤。分组按「改哪块」分区，实时预览固定顶部不在此列 */
export const GROUPS = [
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
      { id: 'searchSwap', title: '交换位置', desc: '交换搜索引擎与搜索图标的位置', keywords: ['交换位置', '搜索引擎', '图标', '位置', 'swap', 'search'] }
    ]
  },
  {
    label: '捷径拓展坞',
    rows: [
      { id: 'dock', title: '显示拓展坞', desc: '在页面下侧显示快捷图标栏', keywords: ['显示拓展坞', '拓展坞', 'dock'] },
      { id: 'dockCount', title: '图标数量', desc: '拓展坞最多显示的图标数', keywords: ['图标数量', '拓展坞', '数量'] },
      { id: 'dockOpacity', title: '拓展坞透明度', desc: '调节拓展坞背景的透明程度', keywords: ['拓展坞透明度', '拓展坞', '透明度', 'dock', 'opacity'] },
      { id: 'dockHover', title: '悬浮幅度', desc: '图标悬停浮起幅度，0 关闭', keywords: ['悬浮幅度', '悬浮', '浮起', '拓展坞', 'dock', 'hover'] },
      { id: 'dockName', title: '悬浮名称', desc: '悬停图标时显示名称', keywords: ['悬浮名称', '名称', '拓展坞', 'dock', 'name'] }
    ]
  }
]

export const keywordMatch = (row, q) => {
  const text = (row.title + row.desc + row.keywords.join(' ')).toLowerCase()
  return q.split(/\s+/).every(k => text.includes(k))
}
/* 常用项 = 外观 / 颜色 / 布局 / 磁贴名称；其余样式 / 行为设置归入「个性化」，点按钮展开 */
export const BASIC_ROWS = new Set(['presets', 'theme', 'style', 'accentColor', 'clockColor', 'dateColor', 'autoColor', 'pos', 'searchPos', 'dockPos', 'layout', 'hour', 'density', 'iconSize', 'tileText'])

/* ---- 分段 / 下拉选项 ---- */
export const hourOptions = [['12', '12 小时'], ['24', '24 小时']]
export const posOptions = [['top', '顶部'], ['mid', '中部'], ['bottom', '底部'], ['left', '左上'], ['right', '右上']]
export const themeOptions = [['light', '亮色'], ['dark', '黑暗'], ['system', '跟随系统']]
export const styleOptions = [['glass', '毛玻璃'], ['fluent', 'Fluent 2'], ['borderless', '无界']]
export const dateOptions = [
  ['cn-long', '2026年8月14日 星期五'],
  ['cn-short', '2026-08-14 周五'],
  ['en-long', 'Friday, Aug 14, 2026'],
  ['numeric', '08/14 周五'],
  ['weekday', '星期五'],
  ['lunar', '农历八月初七']
]
export const dockCountOptions = [['3', '3'], ['5', '5'], ['7', '7']]
export const shapeOptions = [['rounded', '圆角'], ['square', '方形'], ['squircle', '半圆角'], ['circle', '圆形']]
export const tileTextOptions = [['always', '始终显示'], ['hover', '悬浮显示'], ['none', '不显示']]
export const searchAnimOptions = [['none', '无'], ['sink', '沉入'], ['lift', '浮升']]
export const tileEnterOptions = [['fade', '整体淡入'], ['drop', '依次落位']]
export const folderAnimOptions = [['normal', '正常缩放'], ['flip', '3D翻转']]
export const densityOptions = [['compact', '紧凑'], ['comfort', '舒适'], ['spacious', '宽松']]
export const openInOptions = [['new', '新标签页'], ['self', '当前页']]

/* 开关行字段映射（state 里的布尔字段名） */
export const toggleField = { sec: 'showSeconds', blink: 'blink', date: 'showDate', dock: 'dockEnabled', vignette: 'wallpaperVignette', glassShine: 'glassShine', autoColor: 'autoColor', searchSwap: 'searchSwap', dockName: 'dockName' }
/* 材质类设置项：在 Fluent / 无界下按需置灰。
   Fluent：全部固定为 Fluent 规范值（CSS [data-style="fluent"] 覆盖）；置灰不可调。
   无界：仅去卡片化相关项固定；搜索框保持玻璃背景，其透明度 / 圆角仍可调 */
export const FIXED_ROWS = ['glass', 'glassShine', 'radius', 'searchOpacity', 'searchRadius', 'dockOpacity', 'iconGlow', 'tileHover']

/* 主题色：单一主色，按钮/图标/文字由 store 自动派生 */
export const ACCENT_PRESETS = ['#39C5BB', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#22C55E', '#EF4444', '#64748B']

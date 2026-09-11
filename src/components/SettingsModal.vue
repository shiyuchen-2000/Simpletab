<script setup>
import { computed, nextTick, ref } from 'vue'
import { state, ui, save, toast, fontStack, resetSettings, DEFAULT_SETTINGS, resolvedTheme } from '../store'
import { useGearModal } from '../store/useGearModal'

/* 每个设置行的标签与描述，用于搜索过滤。分组按「改哪块」分区，实时预览固定顶部不在此列 */
const GROUPS = computed(() => [
  {
    label: '主题',
    rows: [
      { id: 'theme', title: '外观', desc: '亮色 / 黑暗 / 跟随系统', keywords: ['外观', '主题', '亮色', '黑暗', '跟随系统', 'theme'] },
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
      { id: 'pos', title: '时钟位置', desc: '预设摆放位置', keywords: ['时钟位置', '位置', 'top', 'mid', 'bottom', 'left', 'right'] },
      { id: 'sec', title: '显示秒', desc: '在时间后显示秒数', keywords: ['显示秒', '秒', 'second'] },
      { id: 'blink', title: '分隔符闪烁', desc: '时间冒号每秒闪烁', keywords: ['分隔符', '闪烁', '冒号', 'blink'] },
      { id: 'clockColor', title: '时间颜色', desc: '自定义时钟文字颜色', keywords: ['时间颜色', '颜色', 'color'] },
      { id: 'date', title: '显示日期', desc: '在时间下方显示日期', keywords: ['显示日期', '日期', 'date'] },
      { id: 'dateFmt', title: '日期格式', desc: '日期显示样式', keywords: ['日期格式', '格式'] },
      { id: 'dateColor', title: '日期颜色', desc: '自定义日期文字颜色', keywords: ['日期颜色', '颜色'] },
      { id: 'font', title: '时钟字体', desc: '从系统字体库中选择', keywords: ['时钟字体', '字体', 'font'] }
    ]
  },
  {
    label: '磁贴设置',
    rows: [
      { id: 'density', title: '卡片密度', desc: '磁贴间距与大小', keywords: ['密度', '间距', '紧凑', '宽松', 'density'] },
      { id: 'iconShape', title: '图标形状', desc: '磁贴与拓展坞图标的形状', keywords: ['图标形状', '形状', '方形', '圆形', '超椭圆', '圆角', 'icon', 'shape'] },
      { id: 'iconSize', title: '图标尺寸', desc: '图标大小，可手动覆盖卡片密度预设', keywords: ['图标尺寸', '图标大小', '大小', '尺寸', 'icon', 'size'] },
      { id: 'iconGlow', title: '图标光晕', desc: '图标底部光晕的强弱', keywords: ['图标光晕', '光晕', '阴影', '发光', 'glow'] },
      { id: 'tileText', title: '磁贴名称', desc: '始终显示 / 悬浮显示 / 不显示', keywords: ['磁贴名称', '名称', '文字', '隐藏', 'label', 'text'] },
      { id: 'tileHover', title: '悬浮动效', desc: '磁贴悬停上浮距离，调为 0 关闭', keywords: ['悬浮动效', '悬浮', '上浮', 'hover', '动效', '动画'] },
      { id: 'openIn', title: '打开方式', desc: '点击链接时在新标签页或当前页打开', keywords: ['打开方式', '新标签页', '当前页', '新开', 'open', 'tab'] }
    ]
  },
  {
    label: '搜索框',
    rows: [
      { id: 'searchOpacity', title: '搜索框透明度', desc: '调节搜索框背景的透明程度', keywords: ['搜索框透明度', '搜索框', '透明度', 'search', 'opacity'] },
      { id: 'searchRadius', title: '搜索框圆角', desc: '胶囊(29px)到方形(10px)之间调节，实时预览', keywords: ['搜索框圆角', '搜索框', '圆角', 'radius', '胶囊', '方形'] }
    ]
  },
  {
    label: '捷径拓展坞',
    rows: [
      { id: 'dock', title: '显示拓展坞', desc: '在页面下侧显示快捷图标栏', keywords: ['显示拓展坞', '拓展坞', 'dock'] },
      { id: 'dockCount', title: '图标数量', desc: '拓展坞最多显示的图标数', keywords: ['图标数量', '拓展坞', '数量'] },
      { id: 'dockOpacity', title: '拓展坞透明度', desc: '调节拓展坞背景的透明程度', keywords: ['拓展坞透明度', '拓展坞', '透明度', 'dock', 'opacity'] }
    ]
  }
])

const keywordMatch = (row, q) => {
  const text = (row.title + row.desc + row.keywords.join(' ')).toLowerCase()
  return q.split(/\s+/).every(k => text.includes(k))
}
/* 常用项 = 颜色 + 布局；其余样式 / 行为设置归入「个性化」，点按钮展开 */
const BASIC_ROWS = new Set(['theme', 'accentColor', 'clockColor', 'dateColor', 'pos', 'density', 'iconSize'])
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
const dateOptions = [
  ['cn-long', '2026年8月14日 星期五'],
  ['cn-short', '2026-08-14 周五'],
  ['en-long', 'Friday, Aug 14, 2026'],
  ['numeric', '08/14 周五'],
  ['weekday', '星期五']
]
const dockCountOptions = [['3', '3'], ['5', '5'], ['7', '7']]
const shapeOptions = [['rounded', '圆角'], ['square', '方形'], ['squircle', '超椭圆'], ['circle', '圆形']]
const tileTextOptions = [['always', '始终显示'], ['hover', '悬浮显示'], ['none', '不显示']]
/* 开关行字段映射（state 里的布尔字段名） */
const toggleField = { sec: 'showSeconds', blink: 'blink', date: 'showDate', dock: 'dockEnabled', vignette: 'wallpaperVignette', glassShine: 'glassShine' }

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
const densityOptions = [['compact', '紧凑'], ['comfort', '舒适'], ['spacious', '宽松']]
function setGlass(v) { state.glassStrength = parseFloat(v); save() }
function setRadius(v) { state.cardRadius = parseInt(v, 10); save() }
function setSearchRadius(v) { state.searchRadius = parseInt(v, 10); save() }
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
function setClockPos(v) { state.clockPos = v; save() }
function setTheme(v) { state.theme = v; save() }
function setDateFormat(v) { state.dateFormat = v; save() }
function setDockCount(v) { state.dockCount = parseInt(v, 10); save() }
function toggle(field) { state[field] = !state[field]; save() }
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

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('settings')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'settings' && !closing, closing }" @click.self="closeModal">
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

      <!-- 实时预览：固定顶部，调节时始终可见，不参与搜索过滤 -->
      <div class="set-group sm-pinned">
        <div class="set-label">实时预览</div>
        <div class="pv" :class="'pv-' + resolvedTheme" style="margin:0 auto;">
          <div class="pv-clock">12:34</div>
          <div class="pv-search">
            <span class="pv-s-ico"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>
            <span class="pv-engine">{{ engineName }}</span>
          </div>
          <div class="pv-tiles">
            <div class="pv-tile"><span class="pv-t-ico">G</span><span class="pv-t-name">GitHub</span></div>
            <div class="pv-tile"><span class="pv-t-ico">B</span><span class="pv-t-name">哔哩</span></div>
            <div class="pv-tile"><span class="pv-t-ico">M</span><span class="pv-t-name">MDN</span></div>
          </div>
        </div>
      </div>

      <!-- 设置列表：独立滚动 -->
      <div class="sm-scroll" ref="smScrollRef">
      <!-- 收起个性化：展开态置顶，随时可收起 -->
      <Transition name="pg">
        <button v-if="showPersonalized && !ui.searchFilter" class="personalize-btn" @click.stop="togglePersonalized">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
          收起个性化
        </button>
      </Transition>
      <!-- 分组渲染，按搜索过滤（展开 / 收起带过渡） -->
      <TransitionGroup name="pg" tag="div">
        <div v-for="g in visibleRows" :key="g.label" class="set-group" :class="{ 'set-group-first': g === visibleRows[0] }">
          <div class="set-label">{{ g.label }}</div>

          <template v-for="r in g.rows" :key="r.id">
            <!-- 时钟：时间格式 -->
            <div v-if="r.id === 'hour'" class="set-row">
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
            <!-- 开关行 -->
            <div v-else-if="toggleField[r.id]" class="set-row">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <button class="switch" :class="{ on: state[toggleField[r.id]] }" @click="toggle(toggleField[r.id])"></button>
            </div>
            <!-- 日期格式 -->
            <div v-else-if="r.id === 'dateFmt'" class="set-row">
              <div><div class="r-t">日期格式</div><div class="r-d">日期显示样式</div></div>
              <div class="seg" id="segDateFmt">
                <button v-for="[v, label] in dateOptions" :key="v" :class="{ on: state.dateFormat === v }" @click="setDateFormat(v)">{{ label }}</button>
              </div>
            </div>
            <!-- 颜色行 -->
            <div v-else-if="['clockColor','dateColor'].includes(r.id)" class="set-row">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <div class="color-row">
                <input type="color" :value="r.id === 'clockColor' ? clockColorVal : dateColorVal"
                       @input="e => { state[r.id === 'clockColor' ? 'clockColor' : 'dateColor'] = e.target.value; save() }">
                <button class="btn-mini" @click="() => { state[r.id === 'clockColor' ? 'clockColor' : 'dateColor'] = null; save(); toast('已恢复默认' + (r.id === 'clockColor' ? '时间' : '日期') + '颜色') }">默认</button>
              </div>
            </div>
            <!-- 透明度滑块 -->
            <div v-else-if="['searchOpacity','dockOpacity'].includes(r.id)" class="set-row">
              <div><div class="r-t">{{ r.title }}</div><div class="r-d">{{ r.desc }}</div></div>
              <div class="opacity-row">
                <input type="range" min="0.3" max="0.95" step="0.01"
                       :value="state[r.id]" @input="e => { state[r.id] = parseFloat(e.target.value); save() }">
                <span class="opacity-val">{{ Math.round(state[r.id] * 100) }}%</span>
              </div>
            </div>
            <!-- 搜索框圆角 -->
            <div v-else-if="r.id === 'searchRadius'" class="set-row">
              <div><div class="r-t">搜索框圆角</div><div class="r-d">胶囊(29px)到方形(10px)之间调节，实时预览</div></div>
              <div class="opacity-row">
                <input type="range" min="10" max="29" step="1" :value="searchRadiusVal" @input="e => setSearchRadius(e.target.value)">
                <span class="opacity-val">{{ searchRadiusVal }}px</span>
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
            <div v-else-if="r.id === 'glass'" class="set-row">
              <div><div class="r-t">毛玻璃强度</div><div class="r-d">面板与卡片的透明程度</div></div>
              <div class="opacity-row">
                <input type="range" min="0.15" max="0.85" step="0.01" :value="glassVal" @input="e => setGlass(e.target.value)">
                <span class="opacity-val">{{ Math.round(glassVal * 100) }}%</span>
              </div>
            </div>
            <!-- 卡片圆角 -->
            <div v-else-if="r.id === 'radius'" class="set-row">
              <div><div class="r-t">卡片圆角</div><div class="r-d">磁贴与拓展坞的圆角大小</div></div>
              <div class="opacity-row">
                <input type="range" min="8" max="30" step="1" :value="radiusVal" @input="e => setRadius(e.target.value)">
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
            <div v-else-if="r.id === 'iconGlow'" class="set-row">
              <div><div class="r-t">图标光晕</div><div class="r-d">图标底部光晕的强弱</div></div>
              <div class="opacity-row">
                <input type="range" min="0" max="100" step="1" :value="state.iconGlow" @input="e => setIconGlow(e.target.value)">
                <span class="opacity-val">{{ state.iconGlow }}%</span>
              </div>
            </div>
            <!-- 悬浮动效 -->
            <div v-else-if="r.id === 'tileHover'" class="set-row">
              <div><div class="r-t">悬浮动效</div><div class="r-d">悬停上浮距离，0 关闭</div></div>
              <div class="opacity-row">
                <input type="range" min="0" max="12" step="1" :value="state.tileHoverLift" @input="e => setTileHover(e.target.value)">
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
    </div>
  </div>
</template>

<style scoped>
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
</style>

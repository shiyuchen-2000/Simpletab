<script setup>
/* 设置行渲染主体：按行 id 分派所有特殊行（预设/字体行抽为子组件），
   layout 行通过事件上报父级（需父级弹窗实例执行关闭/进入编辑器）。
   state 全局响应式，行组件直接读写 store */
import { computed } from 'vue'
import { state, save, toast, resolvedTheme, autoFitClockColors } from '../../store'
import {
  hourOptions, posOptions, themeOptions, styleOptions, dateOptions, dockCountOptions,
  shapeOptions, tileTextOptions, searchAnimOptions, tileEnterOptions, folderAnimOptions,
  densityOptions, openInOptions, toggleField, FIXED_ROWS, ACCENT_PRESETS
} from '../../settings/config'
import PresetBox from './PresetBox.vue'
import FontRow from './FontRow.vue'

const props = defineProps({ rows: { type: Array, required: true } })
defineEmits(['layout-edit', 'layout-reset', 'open-preset-panel'])

/* 材质类设置项置灰：Fluent 全部固定；无界仅去卡片化相关项固定，搜索框透明度/圆角仍可调 */
const rowFixed = r => {
  if (state.style === 'fluent') return FIXED_ROWS.includes(r.id)
  if (state.style === 'borderless') return FIXED_ROWS.includes(r.id) && !['searchOpacity', 'searchRadius'].includes(r.id)
  return false
}

const clockColorVal = computed(() => state.clockColor || (resolvedTheme.value === 'dark' ? '#f2fdfb' : '#0d2b2e'))
const dateColorVal = computed(() => state.dateColor || (resolvedTheme.value === 'dark' ? '#e9fbf9' : '#0d2b2e'))

/* 主题色：单一主色，按钮/图标/文字由 store 自动派生 */
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
</script>

<template>
  <template v-for="r in props.rows" :key="r.id">
    <!-- 外观预设：一键应用整套外观 -->
    <PresetBox v-if="r.id === 'presets'" @open-panel="$emit('open-preset-panel')" />
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
    <!-- 自定义页面布局：进入全屏拖拽调整（动作在父级执行） -->
    <div v-else-if="r.id === 'layout'" class="set-row">
      <div><div class="r-t">自定义页面布局 <span class="layout-warn">元素可能存在遮挡，请自行调整</span></div><div class="r-d">拖拽时钟 / 搜索框 / 拓展坞，调整位置与大小</div></div>
      <div class="layout-actions">
        <button class="btn btn-ghost" @click="$emit('layout-reset')">重置布局</button>
        <button class="btn btn-primary" @click="$emit('layout-edit')">调整布局</button>
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
    <!-- 拓展坞悬浮幅度 -->
    <div v-else-if="r.id === 'dockHover'" class="set-row">
      <div><div class="r-t">悬浮幅度</div><div class="r-d">拓展坞图标悬停浮起幅度，0 关闭</div></div>
      <div class="opacity-row">
        <input type="range" min="0" max="11" step="1" :value="state.dockHoverLift" @input="e => { state.dockHoverLift = parseInt(e.target.value, 10); save() }">
        <span class="opacity-val">{{ state.dockHoverLift }}px</span>
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
    <FontRow v-else-if="r.id === 'font'" />
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
</template>

<style scoped>
.opacity-row{display:flex;align-items:center;gap:.5rem;}
.opacity-row input[type="range"]{width:110px;accent-color:var(--accent);}
.opacity-val{font-size:.8rem;color:var(--accent-text);min-width:38px;text-align:right;font-variant-numeric:tabular-nums;}
.btn-mini.on{background:var(--accent);color:var(--accent-on);font-weight:600;}
.accent-box{display:flex;flex-direction:column;align-items:flex-end;gap:.55rem;}
.accent-swatches{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:248px;}
.accent-swatch{width:22px;height:22px;border-radius:7px;flex:none;cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s;}
.accent-swatch:hover{transform:scale(1.15);box-shadow:0 3px 8px rgba(0,0,0,.25);}
.accent-swatch.on{outline:2px solid var(--text);outline-offset:2px;}
/* Fluent 风格提示：独立整行，不挤压 seg 控件宽度 */
.style-hint{font-size:.76rem;color:var(--text-faint);line-height:1.5;padding:.35rem .2rem .5rem;border-top:1px dashed var(--glass-border);}
/* 页面布局调整提示：红色弱提示，提醒元素可能存在遮挡 */
.layout-warn{font-size:.68rem;font-weight:400;color:#ff8a94;margin-left:.4rem;vertical-align:1px;}
.layout-actions{display:flex;align-items:center;gap:.5rem;flex:none;}
/* Fluent 风格下材质类设置固定：置灰不可交互 */
.set-row.fixed{opacity:.5;}
.set-row.fixed input[type="range"],.set-row.fixed input[type="color"],.set-row.fixed .switch,.set-row.fixed .btn-mini{cursor:not-allowed;}
</style>

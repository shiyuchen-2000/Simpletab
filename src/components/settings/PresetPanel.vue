<script setup>
/* 自定义预设：右侧滑出面板（透明无边框，分条动画加载），保存/删除默认预设不可删 */
import { ref, computed, watch, onMounted } from 'vue'
import { state, ui, toast, saveCurrentAsPreset } from '../../store'
import { themeOptions, styleOptions, posOptions, dateOptions, densityOptions, shapeOptions, tileTextOptions, searchAnimOptions } from '../../settings/config'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

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
const panelClosing = ref(false)
/* 打开时重置默认名称 / 描述（父级 v-if 控制：每次打开组件重新挂载，onMounted 即初始化） */
onMounted(() => {
  presetName.value = '自定义' + (state.customPresets.length + 1)
  presetDesc.value = ''
  panelClosing.value = false
})
/* 关闭设置弹窗时，预设侧窗同步关闭 */
watch(() => ui.modal, v => { if (v !== 'settings') { emit('close'); panelClosing.value = false } })
function closePresetPanel() {
  panelClosing.value = true
  /* 关闭：分条逐条收起（第一条先消失，依次收起），面板最后淡出 */
  const panel = document.querySelector('.preset-panel')
  if (panel) {
    const items = panel.querySelectorAll('.pp-item')
    items.forEach((el, i) => { el.style.animationDelay = (i * 45) + 'ms' })
  }
  setTimeout(() => { panelClosing.value = false; emit('close') }, 760)
}
function savePreset() {
  saveCurrentAsPreset(presetName.value.trim() || '自定义' + (state.customPresets.length + 1), presetDesc.value.trim())
  emit('close')
  toast('已保存为自定义预设')
}
</script>

<template>
  <div class="preset-panel" :class="{ closing: panelClosing }">
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
</template>

<style scoped>
/* 右侧面板：透明无边框，内容分条动画加载 */
.preset-panel{position:absolute;left:calc(100% + 20px);top:0;bottom:0;width:250px;z-index:5;display:flex;flex-direction:column;pointer-events:auto;transition:transform .3s var(--ease);}
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
</style>

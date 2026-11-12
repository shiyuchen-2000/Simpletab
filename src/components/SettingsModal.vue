<script setup>
/* 设置弹窗壳：弹窗框架 / 左侧目录 / 搜索 / 实时预览 / 常用设置 / 重置。
   设置行渲染在 settings/SettingsRows.vue（含子行组件），配置声明在 settings/config.js */
import { computed, ref } from 'vue'
import { state, ui, toast, save, setView, showConfirm, DEFAULT_SETTINGS } from '../store'
import { useGearModal } from '../store/useGearModal'
import { GROUPS, ROWS_BY_ID, UNPINNABLE_ROWS, keywordMatch } from '../settings/config'
import SettingsRows from './settings/SettingsRows.vue'
import PresetPanel from './settings/PresetPanel.vue'

const smScrollRef = ref(null)
/* 全部设置直接展示；搜索时按关键词过滤 */
const visibleRows = computed(() => {
  const q = ui.searchFilter.trim().toLowerCase()
  if (q) return GROUPS.map(g => ({ label: g.label, rows: g.rows.filter(r => keywordMatch(r, q)) })).filter(g => g.rows.length > 0)
  return GROUPS.filter(g => g.rows.length > 0)
})
/* 常用设置：按收藏顺序取回行配置，星标在行内切换 */
const pinnedRows = computed(() => (state.pinnedSettings || [])
  .filter(id => !UNPINNABLE_ROWS.has(id))
  .map(id => ROWS_BY_ID[id])
  .filter(Boolean))
/* 清空收藏：按钮自身二次确认（3 秒内再点生效），不弹确认框 */
const pinClearArmed = ref(false)
let pinClearTimer = null
function onClearPinned() {
  if (!pinClearArmed.value) {
    pinClearArmed.value = true
    clearTimeout(pinClearTimer)
    pinClearTimer = setTimeout(() => { pinClearArmed.value = false }, 3000)
    return
  }
  clearTimeout(pinClearTimer)
  pinClearArmed.value = false
  state.pinnedSettings = []
  save()
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

/* 需要关闭弹窗的动作（closeModal 依赖本组件弹窗实例） */
function openLayoutEditor() {
  closeModal()
  ui.layoutEdit = true
  setView('home')   // 布局元素主要在主页显示，编辑器打开时切到主页便于拖拽预览
}
function askResetLayout() {
  showConfirm('layoutReset', null, null, null, '重置页面布局？', '将清除自定义调整，恢复默认位置（时钟顶 / 搜索框中 / 拓展坞底）')
}
function openPreview() {
  closeModal()
  ui.preview = true
  setView('home')
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

/* 自定义预设：右侧滑出面板开关（面板自身管理名称/描述/动画） */
const presetPanelOpen = ref(false)
function openPresetPanel() {
  presetPanelOpen.value = true
}

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('settings')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'settings' && !closing, closing }" @click.self="closeModal">
    <div class="sm-wrap">
      <nav class="set-nav">
        <!-- 常用设置入口：有收藏项才显示，随收藏动态出现/消失 -->
        <button v-if="pinnedRows.length && !ui.searchFilter" type="button" :class="{ on: activeGroup === '常用设置' }" @click="scrollToGroup('常用设置')">常用设置</button>
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
      <!-- 常用设置：星标收藏的行（按收藏顺序） -->
      <div v-if="pinnedRows.length && !ui.searchFilter" class="set-group" data-group="常用设置">
        <div class="set-label set-label-bar">
          <span>常用设置</span>
          <button type="button" class="pin-clear" :class="{ armed: pinClearArmed }" @click.stop="onClearPinned">
            {{ pinClearArmed ? '确认清空？' : '清空' }}
          </button>
        </div>
        <SettingsRows :rows="pinnedRows" @layout-edit="openLayoutEditor" @layout-reset="askResetLayout" @open-preset-panel="openPresetPanel" />
      </div>
      <!-- 分组渲染，按搜索过滤；行渲染在 SettingsRows -->
      <TransitionGroup name="pg" tag="div">
        <div v-for="g in visibleRows" :key="g.label" class="set-group" :data-group="g.label" :class="{ 'set-group-first': g === visibleRows[0] }">
          <div class="set-label">{{ g.label }}</div>
          <SettingsRows :rows="g.rows" @layout-edit="openLayoutEditor" @layout-reset="askResetLayout" @open-preset-panel="openPresetPanel" />
        </div>
      </TransitionGroup>

      <!-- 无匹配结果 -->
      <div v-if="visibleRows.length === 0" class="set-empty">
        未找到匹配的设置项
      </div>

      <!-- 重置所有设置 -->
      <div class="set-group" style="margin-top:1.5rem;padding-top:1.3rem;border-top:1px solid var(--glass-border);">
        <button class="btn btn-danger" style="width:100%;justify-content:center;" @click="onReset">
          重置所有设置
        </button>
      </div>
      </div><!-- /sm-scroll -->
      </div><!-- /modal -->

      <!-- 自定义预设：右侧滑出面板 -->
      <PresetPanel v-if="presetPanelOpen" @close="presetPanelOpen = false" />
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
/* 常用设置标题栏：右侧清空按钮，按钮自身二次确认 */
.set-label-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.pin-clear{flex:none;letter-spacing:0;font-size:.72rem;color:var(--text-faint);padding:.18rem .5rem;border-radius:7px;border:1px solid var(--glass-border);background:transparent;transition:color .2s,background .2s,border-color .2s;}
.pin-clear:hover{color:var(--accent-text);border-color:var(--accent);background:rgba(var(--accent-rgb),.1);}
.pin-clear.armed{color:#fff;background:#e5484d;border-color:#e5484d;}
/* 搜索过滤时分组增删的过渡 */
.pg-enter-active,.pg-leave-active{transition:opacity .28s var(--ease),transform .28s var(--ease);}
.pg-enter-from{opacity:0;transform:translateY(-10px);}
.pg-leave-to{opacity:0;transform:translateY(6px);}
.pg-move{transition:transform .28s var(--ease);}
.set-empty{text-align:center;color:var(--text-faint);font-size:.85rem;padding:1.5rem 0;}
/* 实时预览入口 */
.preview-entry{display:flex;align-items:center;gap:10px;width:100%;padding:.7rem .8rem;margin-bottom:.9rem;border-radius:12px;
  font-size:.88rem;font-weight:600;color:var(--accent-text);cursor:pointer;text-align:left;
  background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.3);transition:background .2s,border-color .2s;}
.preview-entry:hover{background:rgba(var(--accent-rgb),.18);border-color:rgba(var(--accent-rgb),.55);}
.preview-entry svg{flex:none;}
.preview-entry em{font-style:normal;font-weight:400;font-size:.72rem;color:var(--text-faint);margin-left:auto;letter-spacing:.02em;}

/* 主面板关闭按钮 hover：预设侧拉栏沿 Z 轴上浮（与左侧目录联动一致）。
   .preset-panel 为 PresetPanel 组件根元素，由父级 scoped 选择器命中 */
.sm-wrap:has(.m-close:hover) .preset-panel{transform:translateZ(24px);}
/* 侧面板打开时：设置弹窗右侧边框泛主题色光晕 */
.sm-wrap:has(.preset-panel) .settings-modal{box-shadow:0 24px 70px rgba(0,0,0,.4), 10px 0 34px rgba(var(--accent-rgb),.32);}
</style>

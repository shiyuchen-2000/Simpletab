<script setup>
/* 设置弹窗壳：弹窗框架 / 左侧目录 / 搜索 / 实时预览 / 个性化 / 重置。
   设置行渲染在 settings/SettingsRows.vue（含子行组件），配置声明在 settings/config.js */
import { computed, nextTick, ref } from 'vue'
import { state, ui, toast, setView, showConfirm, DEFAULT_SETTINGS } from '../store'
import { useGearModal } from '../store/useGearModal'
import { GROUPS, BASIC_ROWS, keywordMatch } from '../settings/config'
import SettingsRows from './settings/SettingsRows.vue'
import PresetPanel from './settings/PresetPanel.vue'

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
  const all = GROUPS
  /* 搜索时全量匹配，绕过简单/个性化模式，避免搜不到 */
  if (q) return all.map(g => ({ label: g.label, rows: g.rows.filter(r => keywordMatch(r, q)) })).filter(g => g.rows.length > 0)
  /* 展开个性化：全量展示 */
  if (showPersonalized.value) return all.filter(g => g.rows.length > 0)
  /* 简单模式：只显示常用项（颜色 + 布局） */
  return all.map(g => ({ label: g.label, rows: g.rows.filter(r => BASIC_ROWS.has(r.id)) })).filter(g => g.rows.length > 0)
})

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
      <!-- 分组渲染，按搜索过滤（展开 / 收起带过渡）；行渲染在 SettingsRows -->
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

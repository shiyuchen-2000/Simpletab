<script setup>
/* 外观预设：一键应用卡片（内置 4 套 + 自定义预设），自定义可删除、可添加为预设 */
import { state, ui } from '../../store'
import { PRESETS, applyPreset, presetTime } from '../../settings/presets'

const emit = defineEmits(['open-panel'])

function askDeletePreset(p) {
  ui.confirm.kind = 'preset'
  ui.confirm.presetId = p.id
  ui.confirm.title = '删除这个预设？'
  ui.confirm.desc = '删除后不可恢复'
  ui.confirm.visible = true
}
</script>

<template>
  <div class="preset-box" style="margin-top:.4rem;">
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
    <button class="preset-add" @click="emit('open-panel')">+ 添加现有设置到预设</button>
  </div>
</template>

<style scoped>
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
</style>

<script setup>
/* 时钟字体行：从系统字体库中选择（ui.fontList 由 store.loadFonts 探测填充） */
import { state, ui, save, toast, fontStack } from '../../store'
</script>

<template>
  <div class="set-group" style="margin-top:0;">
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
</template>

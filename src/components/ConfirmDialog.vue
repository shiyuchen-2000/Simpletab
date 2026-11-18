<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { ui, confirmOk, confirmCancel, confirmPurge } from '../store'

const okText = computed(() => (ui.confirm.kind === 'reset' || ui.confirm.kind === 'layoutReset') ? '重置' : '删除')
/* 彻底删除二次确认：第一次点击进入待确认态，3 秒不操作自动复位，第二次点击才执行 */
const purgeArmed = ref(false)
let purgeTimer = null
function resetPurgeTimer() { clearTimeout(purgeTimer) }
watch(() => ui.confirm.visible, v => {
  resetPurgeTimer()
  if (v) purgeArmed.value = false
})
function onPurge() {
  if (!purgeArmed.value) {
    purgeArmed.value = true
    resetPurgeTimer()
    purgeTimer = setTimeout(() => { purgeArmed.value = false }, 3000)
    return
  }
  resetPurgeTimer()
  confirmPurge()
}
onBeforeUnmount(resetPurgeTimer)
</script>

<template>
  <div class="confirm-backdrop" :class="{ show: ui.confirm.visible }" @click.self="confirmCancel">
    <div class="confirm-box">
      <div class="c-t">{{ ui.confirm.title }}</div>
      <div class="c-d">{{ ui.confirm.desc }}</div>
      <div class="c-actions">
        <button class="btn btn-ghost" @click="confirmCancel">取消</button>
        <button class="btn btn-danger" @click="confirmOk">{{ okText }}</button>
        <button v-if="ui.confirm.kind === 'folder'" class="btn c-purge" :class="{ armed: purgeArmed }" @click="onPurge">
          {{ purgeArmed ? '确认彻底删除？' : '彻底删除' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 文件夹彻底删除：红字按钮，第一次点击后原地变为更醒目的确认态 */
.c-purge{background:transparent;border:1px solid rgba(231,76,86,.45);color:#ff7a84;}
.c-purge:hover{background:rgba(231,76,86,.14);color:#ff9aa2;}
.c-purge.armed{background:rgba(231,76,86,.2);border-color:#ff5c68;color:#ff5c68;font-weight:600;}
</style>

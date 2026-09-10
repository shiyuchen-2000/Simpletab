<script setup>
import { computed } from 'vue'
import { ui, confirmOk, confirmCancel } from '../store'

const okText = computed(() => ui.confirm.kind === 'reset' ? '重置' : '删除')
</script>

<template>
  <div class="confirm-backdrop" :class="{ show: ui.confirm.visible }" @click.self="confirmCancel">
    <div class="confirm-box">
      <div class="c-t">{{ ui.confirm.title }}</div>
      <div class="c-d">{{ ui.confirm.desc }}</div>
      <div class="c-actions">
        <button class="btn btn-ghost" @click="confirmCancel">取消</button>
        <button class="btn btn-danger" @click="confirmOk">{{ okText }}</button>
      </div>
    </div>
  </div>
</template>

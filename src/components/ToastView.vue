<script setup>
import { ui } from '../store'
</script>

<template>
  <div class="toast" :class="{ show: ui.toast.visible, err: ui.toast.err }">{{ ui.toast.msg }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { ui, saveForm, saveBatchForm, closeForm } from '../store'

const titleText = computed(() => ui.linkForm.batch ? '批量新增' : (ui.linkForm.mode === 'add' ? '添加网站' : '编辑网站'))
const okText = computed(() => ui.linkForm.batch ? '批量添加' : (ui.linkForm.mode === 'add' ? '添加' : '保存'))
const formStyle = computed(() => ({ top: ui.linkForm.top + 'px', left: ui.linkForm.left + 'px', transformOrigin: ui.linkForm.origin }))

function onKeydown(e) {
  if (e.key === 'Escape') { closeForm(); return }
  if (e.key !== 'Enter') return
  /* 批量模式 Enter 用于换行，Ctrl/⌘+Enter 提交 */
  if (ui.linkForm.batch) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); saveBatchForm() }
    return
  }
  const tag = e.target && e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') { e.preventDefault(); saveForm() }
}
</script>

<template>
  <div class="overlay-form" :class="{ closing: ui.linkForm.closing }" v-show="ui.linkForm.visible" :style="formStyle" @keydown="onKeydown">
    <div class="f-title">{{ titleText }}</div>
    <div class="seg f-mode" v-if="ui.linkForm.mode === 'add'">
      <button :class="{ on: !ui.linkForm.batch }" @click="ui.linkForm.batch = false">单个新增</button>
      <button :class="{ on: ui.linkForm.batch }" @click="ui.linkForm.batch = true">批量新增</button>
    </div>
    <template v-if="ui.linkForm.batch">
      <div class="f-field">
        <label>网址列表</label>
        <textarea class="f-batch" v-model="ui.linkForm.batchText" rows="6" spellcheck="false" placeholder="每行一个网址，支持三种格式：&#10;https://github.com&#10;GitHub, https://github.com&#10;https://github.com, GitHub"></textarea>
      </div>
    </template>
    <template v-else>
      <div class="f-field">
        <label>网址</label>
        <input type="text" v-model="ui.linkForm.url" placeholder="https://…（可直接粘贴）">
      </div>
      <div class="f-field">
        <label>标题</label>
        <input type="text" v-model="ui.linkForm.name" placeholder="留空自动获取网页标题">
      </div>
    </template>
    <div class="f-err">{{ ui.linkForm.err }}</div>
    <div class="f-actions">
      <button class="btn btn-ghost" @click="closeForm">取消</button>
      <button class="btn btn-primary" @click="ui.linkForm.batch ? saveBatchForm() : saveForm()">{{ okText }}</button>
    </div>
  </div>
</template>

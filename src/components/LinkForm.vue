<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { state, ui, saveForm, saveBatchForm, closeForm } from '../store'

const titleText = computed(() => ui.linkForm.batch ? '批量新增' : (ui.linkForm.mode === 'add' ? '添加网站' : '编辑网站'))
const okText = computed(() => ui.linkForm.batch ? '批量添加' : (ui.linkForm.mode === 'add' ? '添加' : '保存'))
const formStyle = computed(() => ({ top: ui.linkForm.top + 'px', left: ui.linkForm.left + 'px' }))

const folderOptions = computed(() => {
  const arr = [{ value: '', label: '无文件夹' }]
  state.folders.forEach(f => arr.push({ value: f.id, label: f.title }))
  arr.push({ value: '__new', label: '＋ 新建文件夹…' })
  return arr
})

/* 所属文件夹自定义下拉：与搜索框引擎下拉同一套玻璃 / 高亮视觉 */
const folderOpen = ref(false)
const fdWrap = ref(null)
const currentFolderLabel = computed(() => {
  const o = folderOptions.value.find(x => x.value === ui.linkForm.folderSel)
  return o ? o.label : '无文件夹'
})
function pickFolder(v) {
  ui.linkForm.folderSel = v
  folderOpen.value = false
  if (v === '__new') nextTick(() => document.querySelector('.f-newfolder')?.focus())
}
/* 表单关闭时收起下拉；点击下拉外部收起 */
watch(() => ui.linkForm.visible, v => { if (!v) folderOpen.value = false })
function onDocClick(e) {
  if (ui.linkForm.visible && fdWrap.value && !fdWrap.value.contains(e.target)) folderOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function onUrlInput() {
  const v = ui.linkForm.url.trim()
  let title = ui.linkForm.name.trim()
  if (!title && v) {
    try {
      const h = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v).hostname.replace(/^www\./, '')
      title = h.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      ui.linkForm.name = title
    } catch (e) { /* ignore */ }
  }
}
function onKeydown(e) { if (e.key === 'Escape') closeForm() }
</script>

<template>
  <div class="overlay-form" v-show="ui.linkForm.visible" :style="formStyle" @keydown="onKeydown">
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
        <input type="text" v-model="ui.linkForm.url" placeholder="https://…（可直接粘贴）" @input="onUrlInput">
      </div>
      <div class="f-field">
        <label>标题</label>
        <input type="text" v-model="ui.linkForm.name" placeholder="网站名称">
      </div>
    </template>
    <div class="f-field">
      <label>所属文件夹</label>
      <div class="fd" ref="fdWrap">
        <button type="button" class="fd-trigger" :class="{ open: folderOpen }"
                @click.stop="folderOpen = !folderOpen">
          <span class="fd-label">{{ currentFolderLabel }}</span>
          <svg class="fd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="fd-dropdown" v-if="folderOpen">
          <button type="button" v-for="o in folderOptions" :key="o.value"
                  class="fd-item" :class="{ on: o.value === ui.linkForm.folderSel }"
                  @click.stop="pickFolder(o.value)">
            <span class="fd-item-name">{{ o.label }}</span>
            <span class="fd-check" v-if="o.value === ui.linkForm.folderSel">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
          </button>
        </div>
      </div>
      <input class="f-newfolder" type="text" v-show="ui.linkForm.folderSel === '__new'"
             v-model="ui.linkForm.newFolder" placeholder="新文件夹名称">
    </div>
    <div class="f-err">{{ ui.linkForm.err }}</div>
    <div class="f-actions">
      <button class="btn btn-ghost" @click="closeForm">取消</button>
      <button class="btn btn-primary" @click="ui.linkForm.batch ? saveBatchForm() : saveForm()">{{ okText }}</button>
    </div>
  </div>
</template>

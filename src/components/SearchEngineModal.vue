<script setup>
import { ref } from 'vue'
import { state, ui, save as persist, addEngine, updateEngine, deleteEngine } from '../store'
import { useGearModal } from '../store/useGearModal'

const adding = ref(false)   // 顶部"新增"表单是否展开
const editing = ref(null)   // 正在行内编辑的引擎 key
const form = ref({ name: '', url: '' })
const err = ref('')

/* 已知域名的搜索地址后缀：输入域名 → 自动拼成完整搜索 URL（含 {q}） */
const ENGINE_SUFFIX = {
  'baidu.com': '/s?wd={q}',
  'bing.com': '/search?q={q}',
  'google.com': '/search?q={q}',
  'sogou.com': '/web?query={q}',
  'duckduckgo.com': '/?q={q}',
  'zhihu.com': '/search?type=content&q={q}',
  'zh.wikipedia.org': '/w/index.php?search={q}'
}
/* 常用模板：完整拼好的搜索网址（不同引擎参数不同，模板最可靠），点选自动填入 */
const TEMPLATES = [
  { name: '百度', url: 'https://www.baidu.com/s?wd={q}' },
  { name: '必应', url: 'https://www.bing.com/search?q={q}' },
  { name: '谷歌', url: 'https://www.google.com/search?q={q}' },
  { name: '搜狗', url: 'https://www.sogou.com/web?query={q}' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
  { name: 'Yandex', url: 'https://yandex.com/search/?text={q}' },
  { name: '维基百科', url: 'https://zh.wikipedia.org/w/index.php?search={q}' },
  { name: '知乎', url: 'https://www.zhihu.com/search?type=content&q={q}' }
]
function applyTemplate(t) { startAdd(); form.value = { name: t.name, url: t.url } }

/* 拼装：输入「www.baidu.com」→「https://www.baidu.com/s?wd={q}」；
   输入带路径/参数的前缀则补 https 并确保带 {q}；未知域名统一补 ?q={q} */
function assembleUrl(raw) {
  let u = String(raw || '').trim()
  if (!u) return ''
  u = u.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const host = u.split('/')[0].replace(/^www\./, '').split(':')[0]
  if (u.includes('?') || u.includes('=')) {
    if (!u.includes('{q}')) u += (u.includes('?') ? '&' : '?') + 'q={q}'
    return 'https://' + u
  }
  return 'https://' + u + (ENGINE_SUFFIX[host] || '/?q={q}')
}

function startAdd() { adding.value = true; editing.value = null; form.value = { name: '', url: '' }; err.value = '' }
function startEdit(e) { adding.value = false; editing.value = e.key; form.value = { name: e.name, url: e.url }; err.value = '' }
function cancel() { adding.value = false; editing.value = null; form.value = { name: '', url: '' }; err.value = '' }
function save() {
  const name = form.value.name.trim()
  if (!name) { err.value = '请输入引擎名称'; return }
  if (name.length > 10) { err.value = '引擎名称最多 10 个字'; return }
  const url = assembleUrl(form.value.url)
  if (!url || !url.includes('{q}')) { err.value = '网址无法生成，请输入域名，如 www.baidu.com'; return }
  if (editing.value) updateEngine(editing.value, name, url)
  else addEngine(name, url)
  cancel()
}
const confirmDel = ref(null)   // 待确认删除的引擎 key

/* 拖拽排序：直接调整 state.engines 顺序，搜索框引擎下拉同步更新；
   目标行按鼠标上下半高显示「插入到前 / 后」的定位线 */
const dragKey = ref(null)
const dragOverKey = ref(null)
const dragPos = ref(null)   // 'before' | 'after'
function onDragStart(e, key) { dragKey.value = key; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e, key) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move'
  if (dragKey.value === key) return
  const r = e.currentTarget.getBoundingClientRect()
  dragPos.value = e.clientY < r.top + r.height / 2 ? 'before' : 'after'
  dragOverKey.value = key
}
function onDragLeave(e, key) {
  if (dragOverKey.value === key) { dragOverKey.value = null; dragPos.value = null }
}
function onDrop(e, targetKey) {
  e.preventDefault()
  const key = dragKey.value
  dragKey.value = null; dragOverKey.value = null; dragPos.value = null
  if (!key || key === targetKey) return
  const list = state.engines
  const from = list.findIndex(x => x.key === key)
  let to = list.findIndex(x => x.key === targetKey)
  if (from === -1 || to === -1) return
  if (dragPos.value === 'after') to += 1
  const [item] = list.splice(from, 1)
  if (from < to) to -= 1
  list.splice(Math.max(0, Math.min(to, list.length)), 0, item)
  persist()
}
function onDragEnd() { dragKey.value = null; dragOverKey.value = null; dragPos.value = null }
function askDelete(e) {
  if (state.engines.length <= 1) { err.value = '至少保留一个搜索引擎'; return }
  confirmDel.value = e.key
}
function doDelete(e) {
  confirmDel.value = null
  deleteEngine(e.key)
}

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('engine')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'engine' && !closing, closing }" @click.self="closeModal">
    <div class="modal" ref="modalRef" :style="{ transformOrigin: modalOrigin }">
      <div class="m-head">
        <span class="m-title">搜索引擎偏好</span>
        <button class="m-close" @click="closeModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
      <p class="dm-desc">编辑或新增时只需填<b>域名</b>（如 www.baidu.com），保存会自动拼成完整搜索网址。增删改即时反映到搜索框。</p>

      <!-- 常用模板：完整拼好的网址，点选自动填入（不同引擎参数不同，模板最可靠） -->
      <div class="se-templates">
        <span class="se-t-label">常用模板（自动填入完整网址）</span>
        <div class="se-t-list">
          <button v-for="t in TEMPLATES" :key="t.url" class="btn-mini" @click="applyTemplate(t)">{{ t.name }}</button>
        </div>
      </div>

      <!-- 新增入口 -->
      <button class="btn btn-primary se-add-btn" @click="startAdd">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        新增搜索引擎
      </button>

      <!-- 引擎列表：编辑时文本就地变输入框，不弹出表单；左侧手柄拖拽排序 -->
      <div class="se-list">
        <!-- 新增态：列表顶部就地编辑 -->
        <div v-if="adding" class="se-item editing">
          <input class="se-input" v-model="form.name" maxlength="10" placeholder="引擎名称（10 字内）" @keydown.enter="save">
          <input class="se-input" v-model="form.url" placeholder="www.baidu.com（自动拼全）" @keydown.enter="save">
          <div class="se-actions">
            <button class="btn-mini" @click="save">添加</button>
            <button class="btn-mini" @click="cancel">取消</button>
          </div>
        </div>

        <div v-for="e in state.engines" :key="e.key" class="se-item"
             :class="{ editing: editing === e.key, dragging: dragKey === e.key,
                       'drag-over': dragOverKey === e.key, before: dragOverKey === e.key && dragPos === 'before',
                       after: dragOverKey === e.key && dragPos === 'after' }"
             :draggable="editing !== e.key && confirmDel !== e.key"
             @dragstart="onDragStart($event, e.key)" @dragover="onDragOver($event, e.key)"
             @dragleave="onDragLeave($event, e.key)" @drop="onDrop($event, e.key)" @dragend="onDragEnd">
          <span v-if="editing !== e.key" class="se-grip" title="拖拽调整顺序">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.7"/><circle cx="15" cy="5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="19" r="1.7"/><circle cx="15" cy="19" r="1.7"/></svg>
          </span>
          <template v-if="editing === e.key">
            <input class="se-input" v-model="form.name" maxlength="10" @keydown.enter="save">
            <input class="se-input" v-model="form.url" @keydown.enter="save">
            <div class="se-actions">
              <button class="btn-mini" @click="save">保存</button>
              <button class="btn-mini" @click="cancel">取消</button>
            </div>
          </template>
          <template v-else>
            <div class="se-info">
              <span class="se-name" :class="{ on: e.key === state.engine }">{{ e.name }}</span>
              <span class="se-url">{{ e.url }}</span>
            </div>
            <div class="se-actions">
              <template v-if="confirmDel === e.key">
                <span class="se-del-hint">确认删除？</span>
                <button class="btn-mini se-del" @click="doDelete(e)">删除</button>
                <button class="btn-mini" @click="confirmDel = null">取消</button>
              </template>
              <template v-else>
                <button class="btn-mini" @click="startEdit(e)">编辑</button>
                <button class="btn-mini se-del" @click="askDelete(e)">删除</button>
              </template>
            </div>
          </template>
        </div>
      </div>
      <p v-if="err" class="se-err">{{ err }}</p>
    </div>
  </div>
</template>

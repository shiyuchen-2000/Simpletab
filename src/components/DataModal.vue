<script setup>
import { ref, computed, watch } from 'vue'
import { ui, save, toast, hasSyncStorage, syncUsage, refreshSyncUsage } from '../store'
import { exportConfig, applyImport, loadFromSync } from '../store/backup'
import { useGearModal } from '../store/useGearModal'

const fileInput = ref(null)
const pending = ref(null)   // 待确认应用的数据（文件导入 / 云端恢复共用）
const importErr = ref('')
const opts = ref({ settings: true, links: true })   // 导入范围勾选（设置 / 链接与文件夹）

function onExport() {
  exportConfig()
  toast('配置已导出')
}

function pickFile() { fileInput.value?.click() }

function onFile(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  if (!/\.json$/i.test(f.name) && f.type !== 'application/json') { importErr.value = '请选择 .json 配置文件'; return }
  const fr = new FileReader()
  fr.onload = () => {
    try {
      pending.value = JSON.parse(fr.result)
      opts.value = { settings: true, links: true }
      importErr.value = ''
    } catch (err) { pending.value = null; importErr.value = '文件解析失败：不是有效的 JSON' }
  }
  fr.readAsText(f)
}

async function onRestoreCloud() {
  try {
    const data = await loadFromSync()
    if (!data) { importErr.value = '云端没有备份数据'; return }
    pending.value = data
    opts.value = { settings: true, links: true }
    importErr.value = ''
  } catch (err) { importErr.value = '读取云端备份失败' }
}

function onPush() { save(); toast('已触发全量同步') }

function confirmApply() {
  const err = applyImport(pending.value, { settings: opts.value.settings, links: opts.value.links })
  if (err) { importErr.value = err; pending.value = null; return }
  const what = [opts.value.settings && '设置', opts.value.links && '链接'].filter(Boolean).join('与')
  pending.value = null
  closeModal()
  toast('已导入' + what)
}
function cancelApply() { pending.value = null }

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('data')

/* 同步状态 / 用量进度：打开数据管理时刷新；100KB 配额按字节换算百分比（bytes / 1024 = %） */
watch(() => ui.modal, v => { if (v === 'data') refreshSyncUsage() })
const syncKb = computed(() => (syncUsage.value / 1024).toFixed(1))
const syncPct = computed(() => Math.min(100, syncUsage.value / 1024))
const syncWarn = computed(() => syncPct.value >= 90)
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'data' && !closing, closing }" @click.self="closeModal">
    <div class="modal" ref="modalRef" :style="{ transformOrigin: modalOrigin }">
      <div class="m-head">
        <span class="m-title">数据管理</span>
        <button class="m-close" @click="closeModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="dm-sec">
        <div class="dm-sec-title">导出与导入</div>
        <p class="dm-desc">导出当前全部设置与链接为配置文件；导入可<b>分别选择</b>覆盖设置或链接（含文件夹布局），且不可撤销。导出不包含壁纸。</p>
        <div class="dm-actions">
          <button class="btn btn-primary" @click="onExport">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
            导出配置
          </button>
          <button class="btn btn-ghost" @click="pickFile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5-5 5 5"/><path d="M12 5v12"/></svg>
            导入配置
          </button>
        </div>
        <input type="file" ref="fileInput" accept=".json,application/json" hidden @change="onFile">
      </div>

      <div class="dm-sec">
        <div class="dm-sec-title">云端同步</div>
        <p class="dm-desc">跟随浏览器账号自动备份设置与链接（不含壁纸）。以下可手动推送当前配置到云端，或从云端拉取覆盖本机。</p>
        <div class="sync-status-row">
          <span>同步状态</span>
          <span :class="{ 'sync-ok': hasSyncStorage }">{{ hasSyncStorage ? '已通过浏览器账号同步' : '未登录浏览器账号，仅本机保存' }}</span>
        </div>
        <div class="sync-meter">
          <div class="sync-meter-bar" :class="{ warn: syncWarn }" :style="{ width: (hasSyncStorage ? syncPct : 0) + '%' }"></div>
        </div>
        <div class="sync-meter-label">{{ hasSyncStorage ? syncKb + ' KB / 100 KB（' + Math.round(syncPct) + '%）' : '仅本机保存，不占用云端空间' }}</div>
        <div class="dm-actions">
          <button class="btn btn-ghost" @click="onPush">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
            立即同步
          </button>
          <button class="btn btn-ghost" @click="onRestoreCloud">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M8 12h8"/><path d="m12 8 4 4-4 4"/></svg>
            从云端恢复
          </button>
        </div>
      </div>

      <p v-if="importErr" class="dm-err">{{ importErr }}</p>

      <div v-if="pending" class="dm-confirm">
        <div class="dm-confirm-title">确认导入？</div>
        <div class="dm-confirm-desc">选择要导入的内容，未勾选的部分保持当前不变，且不可撤销。壁纸不受影响。</div>
        <div class="dm-options">
          <label class="dm-opt"><input type="checkbox" v-model="opts.settings"> 设置</label>
          <label class="dm-opt"><input type="checkbox" v-model="opts.links"> 链接与文件夹</label>
        </div>
        <div class="dm-confirm-actions">
          <button class="btn btn-ghost" @click="cancelApply">取消</button>
          <button class="btn btn-danger" @click="confirmApply">确认导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

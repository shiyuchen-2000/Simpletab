// ============================================================
// 数据管理：导出 / 导入配置 + 云端手动推拉
// 导出不含壁纸（壁纸走 IndexedDB，本设备独立）；导入为整体覆盖
// ============================================================
import { state, save } from './index'

const APP_TAG = 'SimpleTab'

/* 校验导入数据，合法返回 ''，否则返回错误文案 */
function validate(data) {
  if (!data || typeof data !== 'object' || data.app !== APP_TAG) return '不是有效的 SimpleTab 配置文件'
  const s = data.data && data.data.state
  if (!s || typeof s !== 'object' || !Array.isArray(s.links) || !Array.isArray(s.folders)) return '配置内容不完整，请检查文件'
  return ''
}

/* 导出当前配置为 JSON 文件下载（不含壁纸；view 为临时 UI 状态，不导出） */
export function exportConfig() {
  const snapshot = JSON.parse(JSON.stringify(state))
  delete snapshot.wallpaper
  delete snapshot.view
  const payload = { app: APP_TAG, data: { state: snapshot } }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'simpletab-config.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* 分项应用导入数据：opts.settings 覆盖设置字段，opts.links 替换链接与文件夹布局。
   设置字段按导入文件里实际存在的覆盖（旧版本文件缺字段时保留当前）；links 与 folders 必须成对替换
   （folderId 引用文件夹），因此合并为同一选项。壁纸 / view 永不参与导入。
   成功返回 null，否则返回错误文案 */
const SKIP_KEYS = ['links', 'folders', 'wallpaper', 'view']
export function applyImport(data, opts = { settings: true, links: true }) {
  const err = validate(data)
  if (err) return err
  if (!opts.settings && !opts.links) return '请至少选择一项导入内容'
  const s = data.data.state
  if (opts.settings) {
    for (const k of Object.keys(s)) {
      if (!SKIP_KEYS.includes(k)) state[k] = s[k]
    }
  }
  if (opts.links) {
    state.links = s.links
    state.folders = s.folders
  }
  save()
  return null
}

/* 从云端备份读取配置，整理为与导出文件相同的结构；无备份返回 null */
export async function loadFromSync() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return null
  let data = null
  try {
    const got = await chrome.storage.sync.get('startpage_state')
    if (got && got.startpage_state) data = got.startpage_state
  } catch (e) { /* 读取失败按无备份处理 */ }
  if (!data) return null
  return { app: APP_TAG, data: { state: data } }
}

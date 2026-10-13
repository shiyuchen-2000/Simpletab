// ============================================================
// 搜索引擎：切换 / 循环 / 搜索 / 增删改
// 依赖：state/ui/toast（state.js）、save（persistence.js）、uid（utils.js）
// ============================================================
import { state, ui, toast } from './state'
import { save } from './persistence'
import { uid } from './utils'

export function setEngine(key) {
  const eng = state.engines.find(x => x.key === key)
  if (!eng || eng.key === state.engine) return
  state.engine = eng.key
  save()
  toast('已切换至 ' + eng.name)
}
export function cycleEngine() {
  const list = state.engines
  if (!list.length) return
  const i = list.findIndex(x => x.key === state.engine)
  setEngine(list[(i + 1) % list.length].key)
  ui.flip = true
  setTimeout(() => { ui.flip = false }, 500)
}
export function doSearch() {
  /* 实时预览模式：禁止搜索跳转（与禁止访问链接一致） */
  if (ui.preview) { toast('预览模式下不可搜索'); return }
  const q = ui.searchQuery.trim()
  if (!q) return
  const eng = state.engines.find(x => x.key === state.engine)
  if (!eng) return
  /* 协议白名单：引擎 url 可能来自导入/同步的不可信数据，拒绝非 http/https（H1） */
  if (!/^https?:\/\//i.test(eng.url)) return
  window.open(eng.url.replace('{q}', encodeURIComponent(q)), '_self')
}
/* 引擎增删改：编辑结果即时反映到搜索框引擎胶囊与下拉 */
export function addEngine(name, url) {
  const key = uid()
  state.engines.push({ key, name, url })
  save()
  return key
}
export function updateEngine(key, name, url) {
  const e = state.engines.find(x => x.key === key)
  if (e) { e.name = name; e.url = url; save() }
}
export function deleteEngine(key) {
  state.engines = state.engines.filter(x => x.key !== key)
  if (state.engine === key) state.engine = state.engines[0]?.key || ''
  save()
}

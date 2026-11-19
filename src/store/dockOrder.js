// ============================================================
// 拓展坞独立顺序：state.dockOrder 存链接 id 列表，与 links 数组顺序解耦
// 未记录的新链接按 links 顺序追加；已移出拓展坞的 id 自动忽略
// ============================================================
import { state } from './state'

/* 当前拓展坞链接的完整顺序（含 dockCount 之外的项） */
export function dockListOrdered() {
  const docked = state.links.filter(l => l.inDock)
  const byId = new Map(docked.map(l => [l.id, l]))
  const out = []
  const seen = new Set()
  for (const id of (state.dockOrder || [])) {
    const l = byId.get(id)
    if (l && !seen.has(id)) { out.push(l); seen.add(id) }
  }
  for (const l of docked) if (!seen.has(l.id)) out.push(l)
  return out
}

/* 可见拓展坞（前 dockCount 个）的 id 顺序 */
export function visibleDockIds() {
  return dockListOrdered().slice(0, state.dockCount || 7).map(l => l.id)
}

/* 拖动换位：把 dragId 移到 targetId 前/后。返回是否发生移动。
   只改 dockOrder，不动 links 顺序（链接页排序不受影响） */
export function moveDockLink(dragId, targetId, after) {
  if (!dragId || !targetId || dragId === targetId) return false
  const ids = visibleDockIds()
  const from = ids.indexOf(dragId)
  if (from < 0 || !ids.includes(targetId)) return false
  ids.splice(from, 1)
  const insert = ids.indexOf(targetId) + (after ? 1 : 0)
  ids.splice(insert, 0, dragId)
  const visibleSet = new Set(ids)
  /* 不可见项保持既有相对顺序，追加在可见项之后 */
  const rest = dockListOrdered().map(l => l.id).filter(id => !visibleSet.has(id))
  state.dockOrder = [...ids, ...rest]
  return true
}

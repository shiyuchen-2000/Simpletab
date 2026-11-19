// ============================================================
// 拖拽插入位计算（纯读取 DOM，无写副作用）
// 在 flex-wrap 磁贴中按"先定位行、再定位列"计算插入索引，避免跨行误判
// 供 LinkGrid（根级排序）与 FolderPanel（文件夹内排序）共用
// ============================================================

export function computeInsertIndex(container, clientX, clientY) {
  const all = [...container.querySelectorAll('.tile:not(.add)')]
  if (!all.length) return { tiles: all, index: 0 }
  // 按视觉顶部分行（容差 4px）
  const rows = []
  for (const t of all) {
    const r = t.getBoundingClientRect()
    let row = rows.find(rw => Math.abs(rw.top - r.top) < 4)
    if (!row) { row = { top: r.top, bottom: r.bottom, items: [] }; rows.push(row) }
    row.items.push({ el: t, rect: r })
    row.bottom = Math.max(row.bottom, r.bottom)
  }
  rows.sort((a, b) => a.top - b.top)
  // 找到鼠标所在行
  let row = rows.find(rw => clientY >= rw.top && clientY <= rw.bottom)
  if (!row) {
    // 在两行之间或区域外：靠近哪行归哪行；在所有行之上取首行，之下取末行
    row = clientY < rows[0].top ? rows[0] : rows[rows.length - 1]
  }
  row.items.sort((a, b) => a.rect.left - b.rect.left)
  // 行内：按磁贴中点判断落在它之前还是之后
  let index = all.indexOf(row.items[0].el)
  for (const it of row.items) {
    const mid = it.rect.left + it.rect.width / 2
    if (clientX >= mid) index = all.indexOf(it.el) + 1
    else break
  }
  return { tiles: all, index }
}

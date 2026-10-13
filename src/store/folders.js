// ============================================================
// 文件夹面板：打开 / 关闭（含关闭动画计时）/ 重命名 / 空文件夹自动清理
// 注意：deleteFolder（确认删除入口）在 interactions.js，避免反向依赖交互层
// 依赖：state/ui（state.js）、save（persistence.js）
// ============================================================
import { state, ui } from './state'
import { save } from './persistence'

let folderCloseTimer = null
export function closeFolder() {
  if (!ui.folderOpenId && !ui.folderClosing) return
  ui.folderOpenId = null
  ui.folderClosing = true
  clearTimeout(folderCloseTimer)
  /* 保持 closing 状态足够久，覆盖 3D 翻转关闭动画（0.4s）完整播放后再复位 */
  folderCloseTimer = setTimeout(() => { ui.folderClosing = false }, 460)
}
export function openFolder(fid) {
  /* 切换视图的瞬间不打开文件夹：drop 模式下 setView('home') 延迟 560ms 才改 view，
     需同时检查 ui.linksLeaving（切主页立即置位）避免残留磁贴被误点 */
  if (state.view !== 'links' || ui.linksLeaving) return
  clearTimeout(folderCloseTimer)
  ui.folderClosing = false
  ui.folderOpenId = fid
}
export function renameFolder(fid, title) {
  const f = state.folders.find(x => x.id === fid)
  if (f && title.trim()) { f.title = title.trim(); save() }
}

/* 自动删除空文件夹（无链接归属时），返回是否删除了文件夹 */
export function pruneEmptyFolders() {
  let removed = false
  state.folders.forEach(f => {
    if (!state.links.some(l => l.folderId === f.id)) {
      state.folders = state.folders.filter(x => x.id !== f.id)
      /* 若删除的是当前打开的面板，关闭面板遮罩 */
      if (ui.folderOpenId === f.id) {
        ui.folderOpenId = null
        ui.folderClosing = true
        clearTimeout(folderCloseTimer)
        folderCloseTimer = setTimeout(() => { ui.folderClosing = false }, 240)
      }
      removed = true
    }
  })
  return removed
}

// ============================================================
// 交互编排：视图切换 / 右键上下文菜单 / 确认框 / 删除确认入口 / 拓展坞可见性
// 汇集需要跨领域协调的动作（删链接/文件夹的"确认"入口放这里，
// 使 links/folders 不必反向依赖交互层，整条依赖链无环）。
// 依赖：state/ui/toast（state.js）、save（persistence.js）、folders / links / presets / layout / reset
// 副作用（模块加载即注册）：视图状态 body 类同步
// ============================================================
import { watch, watchEffect } from 'vue'
import { state, ui, toast } from './state'
import { save } from './persistence'
import { closeFolder, pruneEmptyFolders } from './folders'
import { openEditForm, moveOutFolder, closeForm } from './links'
import { deletePreset } from './presets'
import { resetPageLayout } from './layout'
import { resetSettings } from './reset'

/* ---------- 视图切换 ---------- */
export function setView(v) {
  if (state.view === v) return
  if (v === 'home' && state.view === 'links' && !ui.linksLeaving && state.tileEnter === 'drop') {
    /* 离开链接页且磁贴为落位模式：先播磁贴依次收起动画（linksLeaving），
       结束后再切视图，避免磁贴瞬间隐藏而生硬。
       先立即关掉弹层/下拉（否则收起动画期间设置下拉还开着，观感割裂），
       同时移除 linksSection 的 view-enter（入场动画类）——否则落位动画特异性
       高于收起动画，收起会被入场动画覆盖而失效 */
    ui.linksLeaving = true
    closeAllPopups()
    closeFolder()
    document.getElementById('linksSection')?.classList.remove('view-enter')
    setTimeout(() => {
      ui.linksLeaving = false
      state.view = 'home'
      ui.homeLeaving = false
      save()
    }, 560)
    return
  }
  state.view = v
  closeAllPopups()
  closeFolder()
  if (v === 'home') {
    ui.homeLeaving = false
    save()
    return
  }
  if (v === 'links') {
    ui.homeLeaving = true
    setTimeout(() => { ui.homeLeaving = false }, 280)
    save()
  }
}
export function closeAllPopups() {
  ui.dropdownOpen = false
  ui.modal = null
  ui.ctxMenu.visible = false
  ui.linkForm.visible = false
  ui.confirm.visible = false
}

/* 启动新手指引：收起下拉与弹窗，回到主页从第一步开始 */
export function startTour() {
  closeAllPopups()
  if (state.view !== 'home') setView('home')
  ui.tourActive = true
}

/* ---------- 拓展坞可见性 ---------- */
export const dockVisible = () => {
  const list = state.links.filter(l => l.inDock)
  return state.dockEnabled && list.length > 0 && state.view === 'home'
}

/* body 状态类同步（links-open / dock-visible / links-leaving / tour-active） */
watchEffect(() => {
  document.body.classList.toggle('links-open', state.view === 'links')
  document.body.classList.toggle('links-leaving', ui.linksLeaving)
  document.body.classList.toggle('tour-active', ui.tourActive)
  const visible = dockVisible()
  document.body.classList.toggle('dock-visible', visible)
})

/* 浮层协调：打开文件夹面板时收起新增/编辑表单（表单不与文件夹同屏）。
   注意不做反向（表单打开时不关文件夹）——文件夹内点「+」添加链接时，
   表单锚定在面板内磁贴上、需与面板共存，不能自动关文件夹 */
watch(() => ui.folderOpenId, v => { if (v) closeForm() })

/* ---------- 右键 / 上下文菜单 ---------- */
export function openCtxAt(e, items, linkId, inFolder, folderId) {
  ui.ctxMenu.items = items
  ui.ctxMenu.linkId = linkId
  ui.ctxMenu.folderId = folderId || null
  ui.ctxMenu.inFolder = !!inFolder
  ui.ctxMenu.visible = true
  ui.ctxMenu.x = e.clientX
  ui.ctxMenu.y = e.clientY
}
export function closeCtx() { ui.ctxMenu.visible = false }
export function ctxAction(act) {
  const id = ui.ctxMenu.linkId
  const l = state.links.find(x => x.id === id)
  const anchor = id ? document.querySelector(`[data-id="${id}"]`) : null
  if (act === 'edit') {
    if (id && anchor) { closeCtx(); openEditForm(anchor, id) }
    else closeCtx()
  } else if (act === 'out') {
    closeCtx(); moveOutFolder(id)
  } else if (act === 'dock') {
    if (l) { l.inDock = true; save(); toast('已添加到拓展坞'); closeCtx() }
  } else if (act === 'undock') {
    if (l) { l.inDock = false; save(); toast('已从拓展坞删除'); closeCtx() }
  } else if (act === 'icon-auto') {
    if (l) { l.iconMode = 'auto'; save(); toast('图标已切换为自动适配'); closeCtx() }
  } else if (act === 'icon-text') {
    if (l) { l.iconMode = 'text'; save(); toast('图标已切换为文字图标'); closeCtx() }
  } else if (act === 'confirm-undock') {
    if (l) { closeCtx(); showConfirm('dock', null, null, l.id, '从拓展坞删除「' + l.title + '」？', '仅从拓展坞移除，链接不会被删除') }
  } else if (act === 'del') {
    closeCtx(); deleteLink(id)
  } else if (act === 'del-folder') {
    closeCtx(); deleteFolder(ui.ctxMenu.folderId)
  }
}
/* 文件夹磁贴右键菜单：解散文件夹（二次确认） */
export function buildFolderCtxItems(folderId) {
  return [{ act: 'del-folder', label: '解散文件夹', icon: 'trash', danger: true }]
}
export function buildCtxItems(linkId, inFolder) {
  const l = state.links.find(x => x.id === linkId)
  const items = [{ act: 'edit', label: '编辑', icon: 'edit' }]
  if (inFolder) items.push({ act: 'out', label: '移出文件夹', icon: 'out' })
  items.push(l && l.iconMode === 'text'
    ? { act: 'icon-auto', label: '图标：自动适配', icon: 'image' }
    : { act: 'icon-text', label: '图标：文字图标', icon: 'image' })
  items.push(l && l.inDock
    ? { act: 'undock', label: '从拓展坞删除', icon: 'pin' }
    : { act: 'dock', label: '添加到拓展坞', icon: 'pin' })
  items.push({ act: 'del', label: '删除', icon: 'trash', danger: true })
  return items
}

/* ---------- 确认框 ---------- */
export function showConfirm(kind, linkId, folderId, dockId, title, desc) {
  ui.confirm.kind = kind
  ui.confirm.linkId = linkId
  ui.confirm.folderId = folderId
  ui.confirm.dockId = dockId
  ui.confirm.title = title
  ui.confirm.desc = desc
  ui.confirm.visible = true
}
export function confirmOk() {
  const c = ui.confirm
  if (c.kind === 'reset') {
    resetSettings()
    toast('已重置所有设置')
  } else if (c.kind === 'dock') {
    const l = state.links.find(x => x.id === c.dockId)
    if (l) { l.inDock = false; toast('已从拓展坞删除「' + l.title + '」') }
  } else if (c.kind === 'folder') {
    /* 先移除文件夹磁贴（播消失动画），链接待其动画结束（after-leave）再释放——
       避免「链接先出现让位、文件夹再消失补位」的两段移动 */
    const fid = c.folderId
    state.folders = state.folders.filter(x => x.id !== fid)
    ui.pendingReleaseFid = fid
    closeFolder()
    toast('文件夹已解散')
  } else if (c.kind === 'link') {
    const l = state.links.find(x => x.id === c.linkId)
    if (l) {
      const fid = l.folderId
      state.links = state.links.filter(x => x.id !== c.linkId)
      if (fid) pruneEmptyFolders()
    }
    toast('已删除')
  } else if (c.kind === 'preset') {
    deletePreset(c.presetId)
    toast('预设已删除')
  } else if (c.kind === 'layoutReset') {
    resetPageLayout()
    toast('页面布局已重置')
  }
  c.visible = false
  save()
}
export function confirmCancel() { ui.confirm.visible = false }

/* 删除确认入口（归入交互层：避免 folders/links 反向依赖 showConfirm 形成环） */
export function deleteFolder(fid) {
  const f = state.folders.find(x => x.id === fid)
  showConfirm('folder', null, fid, null, '删除文件夹「' + (f ? f.title : '') + '」？', '文件夹内链接将移出，不会删除')
}
export function deleteLink(id) {
  const l = state.links.find(x => x.id === id)
  showConfirm('link', id, null, null, '删除「' + (l ? l.title : '') + '」？', '删除后不可恢复')
}

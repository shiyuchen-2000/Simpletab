// ============================================================
// 磁贴图标兜底（有 DOM 副作用，供 FolderPanel / LinkGrid / DockBar 共用）
// 加载失败移除 img 露出字母；加载成功隐藏底层字母；text 模式强制显示字母
// ============================================================

export function onImgError(e) {
  const fl = e.target.closest('.t-ico, .dock-item')?.querySelector('.fl')
  if (fl) fl.style.display = ''
  e.target.remove()
}

export function onImgLoad(e) {
  const img = e.target
  if (img.naturalWidth > 1 && img.naturalHeight > 1) {
    const fl = img.closest('.t-ico, .dock-item')?.querySelector('.fl')
    if (fl) fl.style.display = 'none'
  } else {
    img.remove()   // 1xN 之类坏图 cover 拉伸会显示成横/竖条，丢弃露出字母
  }
}

/* 文字图标显示：text 模式强制显示，清除 auto 模式加载图标后残留的内联 display:none */
export function letterStyle(l) {
  return l.iconMode === 'text' ? { display: '' } : {}
}

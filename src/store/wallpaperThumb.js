// ============================================================
// 壁纸缩略图：把图片 / 视频 Blob 压成 ~96px 小图写入首帧缓存
// 依赖：bootCache（localStorage 读写）
// 失败全程静默——缩略图只是首帧优化，不影响壁纸本身
// ============================================================
import { setBootThumb, clearBootThumb } from './bootCache'

const THUMB_W = 96

function canvasToThumb(canvas) {
  try {
    const webp = canvas.toDataURL('image/webp', 0.6)
    if (webp && webp !== 'data:,') return webp
  } catch (e) { /* webp 不可用，回退 png */ }
  try { return canvas.toDataURL('image/png') } catch (e) { return '' }
}

function drawToThumb(source, sw, sh) {
  if (!sw || !sh) return ''
  const scale = Math.min(1, THUMB_W / sw)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(sw * scale))
  c.height = Math.max(1, Math.round(sh * scale))
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, c.width, c.height)
  return canvasToThumb(c)
}

/* 图片：原图 → 96px 宽缩略图 */
export async function saveWallpaperThumb(blob) {
  try {
    if (!blob || !(blob.type || '').startsWith('image/')) return ''
    const bmp = await createImageBitmap(blob)
    const data = drawToThumb(bmp, bmp.width, bmp.height)
    bmp.close && bmp.close()
    if (data) setBootThumb(data)
    return data
  } catch (e) { return '' }
}

/* 视频：等首帧可解码后截一张 */
export async function saveVideoThumb(blob) {
  let url = ''
  try {
    if (!blob || !(blob.type || '').startsWith('video/')) return ''
    url = URL.createObjectURL(blob)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = url
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 6000)
      v.onloadeddata = () => { clearTimeout(timer); resolve() }
      v.onerror = () => { clearTimeout(timer); reject(new Error('error')) }
    })
    /* 尽量避开纯黑首帧；seek 失败就画当前帧 */
    if (v.currentTime === 0 && v.duration > 0.15) {
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 1500)
        v.onseeked = () => { clearTimeout(timer); resolve() }
        try { v.currentTime = 0.1 } catch (e) { clearTimeout(timer); resolve() }
      })
    }
    const data = drawToThumb(v, v.videoWidth, v.videoHeight)
    if (data) setBootThumb(data)
    return data
  } catch (e) { return '' }
  finally { if (url) URL.revokeObjectURL(url) }
}

/* 从现有 objectURL / dataURL 补生成（老数据升级、启动自愈用） */
export async function saveThumbFromUrl(url, type) {
  try {
    const blob = await fetch(url).then(r => { if (!r.ok) throw new Error('fetch'); return r.blob() })
    return type === 'video' ? await saveVideoThumb(blob) : await saveWallpaperThumb(blob)
  } catch (e) { return '' }
}

/* 清除缩略图，并移除 boot.js 在 <html> 上留下的内联背景变量 */
export function clearWallpaperThumb() {
  clearBootThumb()
  try { document.documentElement.style.removeProperty('--bg-default') } catch (e) { /* ignore */ }
}

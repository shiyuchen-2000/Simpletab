<script setup>
import { computed, ref } from 'vue'
import { state, ui, save, toast, resolvedTheme, isVideoWallpaper } from '../store'
import { saveWallpaperBlob, clearWallpaperBlob } from '../store/wallpaperDB'
import { useGearModal } from '../store/useGearModal'

const fileInput = ref(null)

const previewStyle = computed(() => {
  /* 图片壁纸：预览背景；视频壁纸/默认壁纸：极光渐变占位（视频由下方 video 元素实时渲染） */
  if (state.wallpaper && !isVideoWallpaper.value) return { backgroundImage: `url(${state.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  /* 默认壁纸：跟随主题展示极光亮/暗版，与初始页背景一致 */
  const grad = resolvedTheme.value === 'dark'
    ? 'radial-gradient(55% 50% at 20% 14%, rgba(56,110,190,.6), transparent 66%),radial-gradient(50% 45% at 82% 18%, rgba(140,72,186,.5), transparent 66%),radial-gradient(65% 55% at 52% 92%, rgba(26,138,160,.55), transparent 66%),radial-gradient(38% 32% at 40% 55%, rgba(210,90,150,.28), transparent 72%),linear-gradient(160deg,#080d1c 0%,#0e1730 55%,#13223c 100%)'
    : 'radial-gradient(52% 46% at 18% 12%, rgba(255,255,255,.95), transparent 66%),radial-gradient(48% 42% at 84% 18%, rgba(150,214,222,.5), transparent 66%),radial-gradient(55% 50% at 48% 96%, rgba(168,176,236,.4), transparent 66%),radial-gradient(30% 28% at 66% 52%, rgba(244,172,196,.25), transparent 70%),linear-gradient(162deg,#f6f8fc 0%,#e4eef4 45%,#d9e4ef 100%)'
  return { background: grad, backgroundSize: 'cover', backgroundPosition: 'center' }
})

function pick() { fileInput.value?.click() }

/* 壁纸：≤3840 的原图直接原样存 Blob（零重编码、零画质损失）；超大图才降采样（JPEG 0.9，透明图保留 PNG）。
   IndexedDB 配额充足，原图直存不再像 base64 时代那样拖累内存与每次保存 */
const MAX_DIM = 3840

/* 替换当前壁纸：URL + 类型成对更新。objectURL 换新前 revoke 旧的避免内存泄漏；
   video 元素正在解码时立即 revoke 会报 Failed to load resource，故延迟 1s 释放 */
function swap(url, type) {
  const old = state.wallpaper
  if (old && old.startsWith('blob:')) {
    if (state.wallpaperType === 'video') setTimeout(() => URL.revokeObjectURL(old), 1000)
    else URL.revokeObjectURL(old)
  }
  state.wallpaper = url
  state.wallpaperType = type
}

/* 视频壁纸体积上限 */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024   // 500MB（配合 unlimitedStorage）

/* 视频有效性探测：能解析出元数据（时长/尺寸）才算有效，.txt 改名 .mp4 之类在此被拦下。
   探测用临时 objectURL 用后即 revoke，无泄漏 */
function probeVideo(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = ok => { URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); ok ? resolve() : reject() }
    const timer = setTimeout(() => done(false), 8000)
    v.preload = 'metadata'
    v.onloadedmetadata = () => { clearTimeout(timer); done(true) }
    v.onerror = () => { clearTimeout(timer); done(false) }
    v.src = url
  })
}

/* 像素是否含透明（alpha<250 视为透明） */
function hasAlpha(ctx, w, h) {
  try {
    const d = ctx.getImageData(0, 0, w, h).data
    for (let i = 3; i < d.length; i += 4) { if (d[i] < 250) return true }
  } catch (e) { /* 读取像素失败按无透明处理 */ }
  return false
}

async function onFile(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return

  /* 视频分支：直接存原始 File（不重编码，与图片原图直存哲学一致），500MB 上限 + 元数据探测。
     保存失败绝不先 swap——否则内存态壁纸刷新即丢，且类型与落盘不一致 */
  if (f.type.startsWith('video/')) {
    if (f.size > MAX_VIDEO_BYTES) { toast('视频壁纸不能超过 500MB', 'err'); return }
    try { await probeVideo(f) } catch (err) { toast('无法读取该视频文件，请换一个', 'err'); return }
    try { await saveWallpaperBlob(f) } catch (err) { toast('壁纸保存失败：文件过大或存储空间不足', 'err'); return }
    swap(URL.createObjectURL(f), 'video')
    save()
    toast('视频壁纸已应用' + (f.size > 100 * 1024 * 1024 ? '（占用 ' + (f.size / 1024 / 1024).toFixed(0) + 'MB）' : ''))
    return
  }

  if (!/^image\//.test(f.type)) { toast('请选择图片或视频文件', 'err'); return }
  try {
    const bmp = await createImageBitmap(f)
    let blob
    if (Math.max(bmp.width, bmp.height) <= MAX_DIM) {
      /* 原图直存：File 本就是 Blob，不经 canvas 重编码，保持原画质 */
      blob = f
    } else {
      const scale = MAX_DIM / Math.max(bmp.width, bmp.height)
      const w = Math.round(bmp.width * scale)
      const h = Math.round(bmp.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bmp, 0, 0, w, h)
      blob = await new Promise(res => c.toBlob(res, hasAlpha(ctx, w, h) ? 'image/png' : 'image/jpeg', 0.9))
    }
    bmp.close && bmp.close()
    if (!blob) { toast('图片处理失败', 'err'); return }
    try { await saveWallpaperBlob(blob) } catch (err) { toast('壁纸保存失败：文件过大或存储空间不足', 'err'); return }
    swap(URL.createObjectURL(blob), 'image')
    save()
    toast('壁纸已应用')
  } catch (err) {
    toast('无法读取该图片', 'err')
  }
}

async function remove() {
  await clearWallpaperBlob().catch(() => {})
  swap(null, null)
  save()
  toast('已恢复默认壁纸')
}

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('wallpaper')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'wallpaper' && !closing, closing }" @click.self="closeModal">
    <div class="modal" ref="modalRef" :style="{ transformOrigin: modalOrigin }">
      <div class="m-head">
        <span class="m-title">壁纸自定义</span>
        <button class="m-close" @click="closeModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
      <div class="wp-preview" :style="previewStyle">
        <video v-if="isVideoWallpaper" class="wp-preview-video" :src="state.wallpaper" muted autoplay loop playsinline></video>
        <span class="wp-tag">{{ isVideoWallpaper ? '当前视频壁纸' : '当前壁纸' }}</span>
      </div>
      <p class="wp-desc">将您喜爱的图片或视频作为壁纸（视频不超过 500MB）</p>
      <div class="wp-actions">
        <button class="btn btn-primary" @click="pick">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          选择壁纸
        </button>
        <button class="btn btn-ghost" @click="remove">移除壁纸 / 恢复默认</button>
      </div>
      <input type="file" ref="fileInput" accept="image/*,video/*" hidden @change="onFile">
    </div>
  </div>
</template>

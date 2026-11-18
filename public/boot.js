/* 首帧预设（经典脚本，必须在 <head> 中同步执行）：
   在 Vue 挂载前应用主题与壁纸缩略图，避免刷新时先闪一下默认壁纸。
   数据由 src/store/bootCache.js 同步写入 localStorage['simpletab_boot']。
   注意：MV3 扩展 CSP 禁止内联脚本，因此本文件必须放在 public/ 下由同源加载。 */
(function () {
  var root = document.documentElement
  var data = null
  try { data = JSON.parse(localStorage.getItem('simpletab_boot') || 'null') } catch (e) { return }
  if (!data || typeof data !== 'object') return

  var theme = data.theme
  if (theme === 'system') {
    try {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (e) { theme = 'dark' }
  }
  if (theme === 'dark' || theme === 'light') root.setAttribute('data-theme', theme)

  var thumb = data.thumb
  if (typeof thumb === 'string' && thumb.length < 300000 &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(thumb)) {
    root.style.setProperty('--bg-default', 'url("' + thumb + '")')
  }
})()

import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import { loadState, loadFonts, applySaved, restoreFromSync, state } from './store'
import { loadFaviconCache, warmFaviconCache } from './store/faviconCache'

async function bootstrap() {
  // 并行读取：状态 + favicon 缓存。缓存命中时首帧即显示本地图标，无"字母→图标"闪烁
  const [saved] = await Promise.all([loadState(), loadFaviconCache()])
  if (saved) {
    applySaved(saved)
  } else {
    // 本地数据为空（例如 Edge 清缓存清了扩展存储）：稍等账号云同步重新拉取后自动恢复，成功后顺手预热图标
    setTimeout(() => { restoreFromSync().then(ok => { if (ok) warmFaviconCache(state.links) }) }, 1500)
  }
  createApp(App).mount('#app')
  /* 标签页 favicon 兜底：Edge/Chromium 对 newtab 覆盖页的静态 favicon 有时不刷新到标签栏，
     页面加载后动态重设 favicon link 可触发浏览器重新抓取并更新标签图标 */
  setTimeout(ensureTabFavicon, 0)
  // 字体探测 + favicon 预热延后到浏览器空闲执行，避免阻塞首屏渲染
  const idle = () => { loadFonts(); warmFaviconCache(state.links) }
  if ('requestIdleCallback' in window) requestIdleCallback(idle, { timeout: 1500 })
  else setTimeout(idle, 300)
}

/* 移除并重设 favicon link（16/32/48 三尺寸），触发浏览器对标签栏图标的重新抓取 */
function ensureTabFavicon() {
  const sizes = [16, 32, 48]
  const head = document.head
  head.querySelectorAll('link[rel="icon"]').forEach(l => l.remove())
  for (const s of sizes) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.sizes = `${s}x${s}`
    link.href = `./icons/icon${s}.png`
    head.appendChild(link)
  }
}

bootstrap()

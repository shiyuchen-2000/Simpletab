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
  // 字体探测 + favicon 预热延后到浏览器空闲执行，避免阻塞首屏渲染
  const idle = () => { loadFonts(); warmFaviconCache(state.links) }
  if ('requestIdleCallback' in window) requestIdleCallback(idle, { timeout: 1500 })
  else setTimeout(idle, 300)
}

bootstrap()

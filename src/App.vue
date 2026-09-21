<script setup>
import { computed, watch, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { state, ui, setView, closeFolder, closeCtx, closeForm, openCtxAt, buildCtxItems, dockVisible, isVideoWallpaper } from './store'
import ClockView from './components/ClockView.vue'
import SearchBar from './components/SearchBar.vue'
import LinkGrid from './components/LinkGrid.vue'
import SettingsGear from './components/SettingsGear.vue'
import SettingsModal from './components/SettingsModal.vue'
import WallpaperModal from './components/WallpaperModal.vue'
import DataModal from './components/DataModal.vue'
import SearchEngineModal from './components/SearchEngineModal.vue'
import AboutModal from './components/AboutModal.vue'
import LinkForm from './components/LinkForm.vue'
import ContextMenu from './components/ContextMenu.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import FolderPanel from './components/FolderPanel.vue'
import DockBar from './components/DockBar.vue'
import ToastView from './components/ToastView.vue'
import TourGuide from './components/TourGuide.vue'

const homeClasses = computed(() => ({
  hidden: state.view !== 'home',
  'home-leaving': ui.homeLeaving,
  'pos-top': state.clockPos === 'top',
  'pos-mid': state.clockPos === 'mid',
  'pos-bottom': state.clockPos === 'bottom',
  'pos-left': state.clockPos === 'left',
  'pos-right': state.clockPos === 'right',
  'dock-lift': dockVisible()
}))

const bgStyle = computed(() => {
  /* 视频壁纸时返回 {}：.bg 的极光渐变自然成为视频加载中的占位背景 */
  if (!state.wallpaper || isVideoWallpaper.value) return {}
  return { backgroundImage: `url(${state.wallpaper})` }
})

/* ---------- 视频壁纸播放控制 ---------- */
const bgVideo = ref(null)
const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
const reduceMotion = ref(reduceMq.matches)
const onReduceChange = e => { reduceMotion.value = e.matches }

/* 播放状态：链接页暂停（blur 作用于静态帧，避免持续模糊运动视频的 GPU 开销）；
   prefers-reduced-motion 下不播放，只显示首帧静态图 */
function syncVideoPlayback() {
  const v = bgVideo.value
  if (!v) return
  if (state.view === 'links' || reduceMotion.value) v.pause()
  else v.play().catch(() => {})
}
watch([isVideoWallpaper, () => state.view, reduceMotion], syncVideoPlayback)
/* 新视频壁纸挂载后 video ref 才就绪，需 nextTick 后再同步一次播放状态 */
watch(isVideoWallpaper, async on => {
  if (on) { await nextTick(); syncVideoPlayback() }
})

/* 视图切换时重播入场动画：视图改为 visibility 常驻（毛玻璃层不重建），
   CSS animation 不会因隐藏/显示重启，需移类 → 强制 reflow → 加类来重触发。
   先 await nextTick：linksSection 的 :class="{ hidden: ... }" 在本轮渲染会用 el.className 覆盖手动加的类，
   不加 nextTick 的话 view-enter 刚加上就被覆盖，视图动画（含磁贴落位）永远不会生效 */
watch(() => state.view, async v => {
  const el = document.getElementById(v === 'links' ? 'linksSection' : 'homeSection')
  if (!el) return
  await nextTick()
  el.classList.remove('view-enter')
  void el.offsetWidth
  el.classList.add('view-enter')
})

const INTERACTIVE = '.tile, #gearZone, .dropdown, .modal-backdrop, .overlay-form, .context-menu, .confirm-backdrop, .folder-backdrop, .toast'

function onContextMenu(e) {
  if (state.view === 'home') {
    if (ui.tourActive) {
      // 引导期间：仅当前步骤明确允许（「进入快捷链接页」步骤）时右键空白才切视图，
      // 否则屏蔽，避免误触导致引导步骤与视图错位
      if (!ui.tourRightClickEnter) { e.preventDefault(); return }
    }
    if (e.target.closest('.search-bar')) return
    e.preventDefault()
    setView('links')
    return
  }
  if (state.view === 'links') {
    const tile = e.target.closest('.tile')
    if (tile && !tile.classList.contains('add') && !tile.classList.contains('folder-tile')) {
      e.preventDefault()
      const inFolder = !!e.target.closest('.fp-grid')
      const id = tile.dataset.id
      openCtxAt(e, buildCtxItems(id, inFolder), id, inFolder)
    }
  }
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (ui.tourActive) return   // 新手指引期间锁定 Esc 切视图，避免打断引导
  if (state.view === 'links') {
    if (ui.folderOpenId || ui.folderClosing) closeFolder()
    else setView('home')
  }
}

// 搜索页点击时间区域 → 进入链接页
function onClockClick(e) {
  if (state.view !== 'home') return
  e.stopPropagation() // 阻止冒泡到 document 空白点击逻辑
  setView('links')
}

// 空白点击判断：用 composedPath 判断是否点到交互区。
// 不能用 e.target.closest —— 若点击的元素在事件冒泡期间被 Vue 重渲染移除（如个性化按钮、搜索清除按钮），
// closest 会因元素已脱离文档而失效，把弹窗内点击误判为空白点击导致关窗回主页
function isInteractiveHit(e) {
  const path = e.composedPath ? e.composedPath() : [e.target]
  return path.some(n => n && n.nodeType === 1 && n.matches && n.matches(INTERACTIVE))
}

function onClick(e) {
  // 引导期间点空白关闭右键菜单 / 添加表单等弹层（不切视图、不回主页）；
  // 必须先于视图判断——home 视图的步骤（如第 3 步拓展坞右键菜单）同样要能点空白关闭
  if (ui.tourActive) {
    if (!isInteractiveHit(e)) { closeCtx(); closeForm() }
    return
  }
  if (state.view !== 'links') return
  if (ui.folderOpenId || ui.folderClosing) {
    if (e.target.classList.contains('folder-backdrop')) closeFolder()
    else if (!e.target.closest('.context-menu')) closeCtx()   // 文件夹内点空白 / 磁贴：关闭右键菜单
    return
  }
  if (!isInteractiveHit(e)) setView('home')
}

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onClick)
  reduceMq.addEventListener?.('change', onReduceChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onContextMenu)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onClick)
  reduceMq.removeEventListener?.('change', onReduceChange)
})
</script>

<template>
  <!-- 背景层（默认清新壁纸 / 图片 / 视频壁纸） -->
  <div class="bg" id="bg" :style="bgStyle">
    <video v-if="isVideoWallpaper" ref="bgVideo" class="bg-video"
      :autoplay="!reduceMotion && state.view === 'home'"
      muted loop playsinline preload="metadata" :src="state.wallpaper"
      @loadeddata="syncVideoPlayback" @canplay="syncVideoPlayback"></video>
    <div class="bg-dim"></div>
    <div class="bg-vignette"></div>
    <div class="bg-tint"></div>
  </div>

  <!-- 时钟：两页统一固定定位 -->
  <div id="clockWrap" :data-pos="state.clockPos" @click="onClockClick">
    <ClockView />
  </div>

  <main id="app">
    <!-- 主页：搜索框 -->
    <section id="homeSection" :class="homeClasses">
      <div class="search-wrap">
        <SearchBar />
      </div>
    </section>

    <!-- 快捷链接页 -->
    <section id="linksSection" :class="{ hidden: state.view !== 'links' }">
      <LinkGrid />
    </section>
  </main>

  <!-- 设置齿轮 + 下拉 -->
  <SettingsGear />
  <!-- 设置弹窗 -->
  <SettingsModal />
  <WallpaperModal />
  <DataModal />
  <SearchEngineModal />
  <AboutModal />
  <!-- 添加上拉框 -->
  <LinkForm />
  <!-- 右键菜单 -->
  <ContextMenu />
  <!-- 删除确认 -->
  <ConfirmDialog />
  <!-- 文件夹面板 -->
  <FolderPanel />
  <!-- 捷径拓展坞 -->
  <DockBar />
  <!-- toast -->
  <ToastView />
  <!-- 新手指引 -->
  <TourGuide />
</template>

<script setup>
/* 搜索框下方的链接联想面板：分离式四圆角浮层，宽度跟随搜索框。
   下方空间不足或与时钟 / 拓展坞重叠时自动翻到上方 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { letterOf } from '../store'
import { faviconSrc } from '../store/faviconCache'
import LetterIco from './LetterIco.vue'

const props = defineProps({
  items: { type: Array, required: true },
  index: { type: Number, default: -1 }
})
const emit = defineEmits(['pick', 'select'])

const panelRef = ref(null)
const up = ref(false)
const width = ref(0)
let ro = null

function overlaps(rect) {
  const hit = el => {
    if (!el) return false
    const b = el.getBoundingClientRect()
    if (!b.width || !b.height) return false
    return rect.left < b.right && rect.right > b.left && rect.top < b.bottom && rect.bottom > b.top
  }
  return hit(document.getElementById('clockWrap')) || hit(document.querySelector('.dock'))
}

/* 测量搜索框宽度与上下空间，决定面板朝下还是朝上 */
function measure() {
  const bar = document.getElementById('searchBar')
  if (!bar) return
  /* 比搜索框稍窄，留出两侧呼吸感 */
  width.value = Math.max(160, Math.round(bar.offsetWidth * 0.95))
  const r = bar.getBoundingClientRect()
  const gap = 10
  const estH = Math.min(props.items.length * 50 + 16, innerHeight * 0.5)
  const below = innerHeight - r.bottom - gap
  const above = r.top - gap
  const rectFor = isUp => (isUp
    ? { top: r.top - gap - estH, bottom: r.top - gap, left: r.left, right: r.right }
    : { top: r.bottom + gap, bottom: r.bottom + gap + estH, left: r.left, right: r.right })
  let next = below < estH + 10 && above > below
  if (overlaps(rectFor(next))) {
    const other = !next
    const otherSpace = other ? above : below
    if (!overlaps(rectFor(other)) && otherSpace > 0) next = other
  }
  up.value = next
}

function onImgError(e) { e.target.remove() }

watch(() => props.items, async () => {
  await nextTick()
  measure()
}, { immediate: true })

watch(() => props.index, async () => {
  await nextTick()
  panelRef.value?.querySelector('.sg-item.on')?.scrollIntoView({ block: 'nearest' })
})

onMounted(() => {
  const bar = document.getElementById('searchBar')
  if (bar) {
    ro = new ResizeObserver(() => measure())
    ro.observe(bar)
  }
  window.addEventListener('resize', measure)
  measure()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div ref="panelRef" class="suggest-panel" :class="{ up }" :style="{ width: width ? width + 'px' : '' }">
    <button v-for="(item, i) in items" :key="item.link.id" type="button" class="sg-item"
            :class="{ on: i === index }"
            @mousedown.prevent
            @mouseenter="$emit('select', i)"
            @click="$emit('pick', item)">
      <span class="sg-ico">
        <img v-if="item.link.iconMode !== 'text' && faviconSrc(item.link.url)" :src="faviconSrc(item.link.url)"
             alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="onImgError">
        <LetterIco :letter="letterOf(item.link.title)" />
      </span>
      <span class="sg-title">{{ item.link.title }}</span>
      <span v-if="item.folder" class="sg-folder">{{ item.folder }}</span>
    </button>
  </div>
</template>

<style scoped>
.suggest-panel{
  position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);
  z-index:5;max-height:min(340px,50vh);overflow-y:auto;padding:6px;
  border-radius:16px;
  background:var(--glass-strong);border:1px solid var(--glass-border);
  box-shadow:0 18px 50px rgba(0,0,0,.32);
  backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);
  animation:suggestIn .16s var(--ease);
}
.suggest-panel.up{top:auto;bottom:calc(100% + 10px);animation-name:suggestUpIn;}
/* 毛玻璃主题：换成液态玻璃材质（低模糊 + 提亮 + 表面反光 + 边缘折射），其他主题保持上方磨砂 */
html[data-style="glass"] .suggest-panel{
  background:
    radial-gradient(120% 90% at 18% -5%, rgba(255,255,255,.20), transparent 45%),
    radial-gradient(70% 50% at 88% 0%, rgba(255,255,255,.10), transparent 40%),
    rgba(255,255,255,.28);
  border-color:rgba(255,255,255,.5);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.4),
    inset 0 0 0 1px rgba(255,255,255,.14),
    0 18px 50px rgba(0,0,0,.32);
  backdrop-filter:blur(2px) saturate(1.8) brightness(1.06) var(--glass-lens,);
  -webkit-backdrop-filter:blur(2px) saturate(1.8) brightness(1.06) var(--glass-lens,);
}
html[data-style="glass"][data-theme="dark"] .suggest-panel{
  background:
    radial-gradient(120% 90% at 18% -5%, rgba(255,255,255,.09), transparent 45%),
    rgba(15,20,26,.34);
  border-color:rgba(255,255,255,.16);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 0 0 1px rgba(255,255,255,.07),
    0 18px 50px rgba(0,0,0,.42);
}
@keyframes suggestIn{from{opacity:0;transform:translateX(-50%) translateY(-6px) scale(.98);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
@keyframes suggestUpIn{from{opacity:0;transform:translateX(-50%) translateY(6px) scale(.98);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
.sg-item{
  display:flex;align-items:center;gap:10px;width:100%;padding:7px 9px;border-radius:11px;
  text-align:left;font-size:.88rem;color:var(--text);transition:background .15s,color .15s;
}
.sg-item.on,.sg-item:hover{background:rgba(var(--accent-rgb),.16);color:var(--accent-text);}
.sg-ico{
  position:relative;flex:none;width:26px;height:26px;border-radius:8px;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  font-size:.8rem;font-weight:600;color:var(--accent-icon-text);
  background:linear-gradient(135deg,var(--accent-grad-a),var(--accent-grad-b));
}
.sg-ico img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.04);z-index:2;}
.sg-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sg-folder{flex:none;max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem;color:var(--text-faint);}
</style>

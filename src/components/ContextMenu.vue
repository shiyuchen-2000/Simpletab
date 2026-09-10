<script setup>
import { ui, ctxAction } from '../store'
import { computed, h } from 'vue'

const style = computed(() => ({
  top: Math.max(0, Math.min(ui.ctxMenu.y, Math.max(0, window.innerHeight - 120))) + 'px',
  left: Math.max(0, Math.min(ui.ctxMenu.x, Math.max(0, window.innerWidth - 180))) + 'px'
}))

// 统一线性图标：stroke 风格、currentColor 跟随文字；路径数据复用 Lucide 风格
const icons = {
  edit: { d: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'] },
  out: { d: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'] },
  image: { d: ['M3 3h18v18H3z', 'M8.5 8.5h.01', 'M21 15l-5-5L5 21'] },
  pin: { d: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'] },
  trash: { d: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'] },
  /* hover 切换目标图标 */
  check: { d: ['M20 6 9 17l-5-5'] },
  arrow: { d: ['M7 7h10v10', 'M7 17 17 7'] },
  type: { d: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'] },
  star: { d: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'] },
  x: { d: ['M18 6 6 18', 'm6 6 12 12'] }
}
// 每个动作图标 hover 时 morph 成的目标图标
const hoverIcons = { edit: 'check', out: 'arrow', image: 'type', pin: 'star', trash: 'x' }

const CtxIcon = (props) => {
  const ic = icons[props.name]
  if (!ic) return null
  return h('svg', {
    class: ['cm-svg', props.cls].filter(Boolean).join(' '),
    width: 16, height: 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
  }, ic.d.map(p => h('path', { d: p })))
}
CtxIcon.props = ['name', 'cls']
</script>

<template>
  <div class="context-menu" v-show="ui.ctxMenu.visible" :style="style" @contextmenu.prevent>
    <button v-for="it in ui.ctxMenu.items" :key="it.act"
            :class="{ del: it.danger }"
            @click="ctxAction(it.act)">
      <span class="cm-ico" v-if="it.icon && icons[it.icon]">
        <CtxIcon :name="it.icon" cls="cm-a" />
        <CtxIcon v-if="hoverIcons[it.icon]" :name="hoverIcons[it.icon]" cls="cm-b" />
      </span>
      <span>{{ it.label }}</span>
    </button>
  </div>
</template>

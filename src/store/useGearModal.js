// ============================================================
// 弹窗从顶部齿轮锚点展开/落回（替代屏幕中心缩放）
// 供常规设置 / 壁纸偏好 / 关于三个面板复用：
//   打开时把 transform-origin 指向齿轮中心，面板从齿轮位置放大展开；
//   关闭时先播放缩回齿轮的退出动画，动画播完再真正关闭
// ============================================================
import { ref, watch, nextTick } from 'vue'
import { ui } from './index'

export function useGearModal(name) {
  const modalRef = ref(null)
  const modalOrigin = ref('50% 50%')
  const closing = ref(false)

  function closeModal() {
    if (closing.value) return
    closing.value = true
    // 等缩回齿轮的退出动画播完再真正关闭（时长与 CSS modalOut 一致）
    setTimeout(() => {
      ui.modal = null
      closing.value = false
    }, 260)
  }

  watch(() => ui.modal, async (v) => {
    if (v !== name) return
    closing.value = false
    const gear = document.getElementById('gearBtn')
    if (!gear) { modalOrigin.value = '50% 50%'; return }
    const r = gear.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    await nextTick()   // 等面板渲染并 flex 居中后再测量，换算相对面板左上角的偏移
    const pr = modalRef.value ? modalRef.value.getBoundingClientRect() : null
    modalOrigin.value = pr ? `${cx - pr.left}px ${cy - pr.top}px` : '50% 50%'
  })

  return { modalRef, modalOrigin, closing, closeModal }
}

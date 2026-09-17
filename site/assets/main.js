/* SimpleTab 宣传页 · 交互脚本 */
(function () {
  // 每次刷新都从顶部开始，不恢复上次滚动位置
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  try { window.scrollTo({ top: 0, behavior: 'instant' }) } catch (e) { document.documentElement.scrollTop = 0 }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 进入遮罩：点击「把起始页，还给自己」按钮后渐隐并触发 Hero 入场（reduced-motion 直接跳过）
  var loader = document.getElementById('loader')
  var loaderBtn = document.getElementById('loaderBtn')
  function reveal() {
    document.body.classList.add('loaded')
    if (loader) { loader.classList.add('hide'); setTimeout(function () { loader.remove() }, 1300) }
  }
  if (reduce) reveal()
  else if (loaderBtn) loaderBtn.addEventListener('click', reveal)

  // 离开首屏后淡出「向下滚动」指示
  var hint = document.getElementById('hint')
  if (hint) {
    var onScroll = function () { hint.style.opacity = window.scrollY > 60 ? '0' : '1' }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  // 悬浮一键到顶
  var toTop = document.getElementById('toTop')
  if (toTop) {
    var toggleTop = function () { toTop.classList.toggle('show', window.scrollY > 400) }
    toggleTop()
    window.addEventListener('scroll', toggleTop, { passive: true })
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    })
  }

  // 关于作者弹窗
  var authorLink = document.getElementById('authorLink')
  var authorMask = document.getElementById('authorMask')
  function openAuthor() {
    authorMask.removeAttribute('hidden')
    requestAnimationFrame(function () { authorMask.classList.add('show') })
  }
  function closeAuthor() {
    authorMask.classList.remove('show')
    setTimeout(function () { authorMask.setAttribute('hidden', '') }, 300)
  }
  if (authorLink && authorMask) {
    authorLink.addEventListener('click', openAuthor)
    authorMask.addEventListener('click', function (e) { if (e.target === authorMask) closeAuthor() })
    var ac = document.getElementById('authorClose'), ao = document.getElementById('authorOK')
    if (ac) ac.addEventListener('click', closeAuthor)
    if (ao) ao.addEventListener('click', closeAuthor)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !authorMask.hasAttribute('hidden')) closeAuthor()
    })
  }

  // 滚动渐显（双向）：进入视口上浮到位，移出视口回落；reduced-motion 下跳过
  if (reduce) return
  var items = document.querySelectorAll('.reveal, .reveal-media, .reveal-desc')
  if (!('IntersectionObserver' in window) || !items.length) return
  // 迟滞触发：进入需可见 25% 才上浮，完全移出视口才回落，避免边缘抖动
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.intersectionRatio >= .25) en.target.classList.add('in')
      else if (en.intersectionRatio === 0) en.target.classList.remove('in')
    })
  }, { threshold: [0, .25] })
  items.forEach(function (el) { io.observe(el) })
})()

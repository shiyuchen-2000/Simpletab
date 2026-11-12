/*
 * 液态玻璃边缘折射 —— SVG 位移滤镜 + 单元素 API
 * 移植自 Glasswork (https://github.com/kubai087/glasswork, MIT License)
 *
 *   const lens = liquidGlass(el, { rim: 40, edge: 1.1, power: 2.6, dispersion: 0.15 })
 *   lens.destroy()
 *
 * 元素需在 backdrop-filter 末尾留一个变量位：
 *   backdrop-filter: blur(2px) saturate(180%) var(--glass-lens,);
 *
 * 仅 Chromium 绘制 backdrop-filter: url(#…)，其他浏览器解析后不绘制，
 * 玻璃退回纯 CSS 效果。贴图见 lens-map.js。
 */
import { LENS_MIN_PX, ROUND_CORNER, cornerExponent, fullMap, lensLayout, lensTiles } from './lens-map'

export const LENS_DEFAULTS = {
  // 边宽上限（px）。小尺寸表面会自动缩到短边的 1/3.5，保留平整中区
  rim: 40,
  // 最外沿向内采样场景的距离，以边宽为单位
  edge: 1.1,
  // 折射从边缘向内衰减的速度：(1 - d / rim) ^ power
  power: 2.6,
  // 红光比蓝光多弯多少；0 表示不分色
  dispersion: 0.15,
  // 圆角半径与超椭圆指数；为 null 时从元素读取
  radius: null,
  corner: null,
  // 用整张位移图：小面板避免九宫格拼接接缝；大面板保持 false 以复用贴图
  fullMap: false,
  // 临时关闭折射而不销毁
  enabled: true,
  // 滤镜写入的 CSS 自定义属性
  property: '--glass-lens',
}

// 边缘参数持续变化（拖拽滑块、窗口缩放）时，先沿用已有镜头拉伸，
// 静止这么久后才重建贴图
const SETTLE_MS = 140

const SVG = 'http://www.w3.org/2000/svg'

// 只有 Chromium 支持 backdrop-filter 中的 url()
export function isLensSupported() {
  if (typeof CSS === 'undefined' || !CSS.supports?.('backdrop-filter', 'url(#a)')) return false
  const ua = navigator.userAgent
  return /Chrome\//.test(ua) && !/Firefox\//.test(ua)
}

// ---------- 滤镜 ----------

function node(tag, attrs, parent) {
  const el = document.createElementNS(SVG, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  parent?.append(el)
  return el
}

let filterCount = 0

// 平整底 + 九宫格贴图组成位移图；背景按位移图弯折一次，
// 或按红绿蓝各弯一次再相加（单通道 screen 即求和）。
// 每个滤镜独占一个 <svg>：往已有图片的 svg 里加节点会让 Chrome 重载全部图片，
// 而引用中的图片重载会让 backdrop-filter 掉模糊。
function buildFilter(width, height, tiles, split, fullMap) {
  const id = `liquid-glass-lens-${++filterCount}`
  const host = node('svg', {
    'aria-hidden': 'true', width: 0, height: 0,
    style: 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none',
  })
  const filter = node('filter', {
    id, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB', x: 0, y: 0, width, height,
  }, host)
  node('feFlood', { 'flood-color': 'rgb(128,128,128)', result: 'flat' }, filter)
  let pieces
  let rects
  if (fullMap) {
    // 整张位移图一次贴满，没有拼接接缝
    pieces = [node('feImage', {
      href: tiles.url, preserveAspectRatio: 'none', x: 0, y: 0, width, height, result: 't0',
    }, filter)]
  } else {
    rects = lensLayout(width, height, tiles.size)
    pieces = rects.map(([x, y, w, h], index) => node('feImage', {
      href: tiles.urls[index], preserveAspectRatio: 'none', x, y, width: w, height: h, result: `t${index}`,
    }, filter))
  }
  /* feMerge 必须在 feImage 之后创建：SVG filter 的输入只能引用前面已定义的图元，
     提前创建会导致位移图引用不到、透镜整体失效 */
  const merge = node('feMerge', { result: 'map' }, filter)
  node('feMergeNode', { in: 'flat' }, merge)
  if (fullMap) node('feMergeNode', { in: 't0' }, merge)
  else rects.forEach((_, index) => node('feMergeNode', { in: `t${index}` }, merge))
  const passes = []
  const pass = () => {
    passes.push({
      el: node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: 0 }, filter),
    })
  }
  if (split) {
    ['r', 'g', 'b'].forEach((name, channel) => {
      pass()
      // 4x5 矩阵对角线上留 1：只保留该通道与 alpha
      const keep = Array.from({ length: 20 }, (_, cell) => Number(cell === channel * 6 || cell === 18)).join(' ')
      node('feColorMatrix', { type: 'matrix', values: keep, result: name }, filter)
    })
    node('feBlend', { in: 'r', in2: 'g', mode: 'screen' }, filter)
    node('feBlend', { in2: 'b', mode: 'screen' }, filter)
  } else {
    pass()
  }
  document.body.append(host)
  return { id, host, filter, pieces, passes, tiles, fullMap }
}

function placeFilter(lens, width, height) {
  lens.filter.setAttribute('width', width)
  lens.filter.setAttribute('height', height)
  if (lens.fullMap) {
    const piece = lens.pieces[0]
    piece.setAttribute('x', 0)
    piece.setAttribute('y', 0)
    piece.setAttribute('width', width)
    piece.setAttribute('height', height)
    return
  }
  lensLayout(width, height, lens.tiles.size).forEach(([x, y, w, h], index) => {
    const piece = lens.pieces[index]
    piece.setAttribute('x', x)
    piece.setAttribute('y', y)
    piece.setAttribute('width', w)
    piece.setAttribute('height', h)
  })
}

// ---------- 单个表面 ----------

/*
 * 给 el 写入边缘折射并随尺寸保持贴合。
 * 返回 { supported, bezel, update(options), refresh(), destroy() }。
 */
export function liquidGlass(el, options = {}) {
  let opts = { ...LENS_DEFAULTS, ...options }
  const supported = isLensSupported()
  let current = null // { key, lens, width, height }
  let token = 0
  let frame = 0
  let lastChange = 0
  let settle = 0
  const api = {
    supported,
    bezel: 0,
    update(next = {}) {
      opts = { ...opts, ...next }
      schedule()
    },
    refresh: () => schedule(),
    destroy,
  }
  if (!supported) {
    // 不支持时全部为无操作
    api.update = () => {}
    api.refresh = () => {}
    api.destroy = () => {}
    return api
  }

  function clear() {
    token += 1
    el.style.removeProperty(opts.property)
    current?.lens.host.remove()
    current = null
  }

  function setScale(lens, bezel) {
    const scale = 2 * opts.edge * bezel
    const split = lens.passes.length > 1
    lens.passes.forEach((p, channel) => {
      const share = split ? 1 + (1 - channel) * opts.dispersion : 1
      p.el.setAttribute('scale', (scale * share).toFixed(1))
    })
  }

  async function fit() {
    frame = 0
    const width = Math.round(el.offsetWidth)
    const height = Math.round(el.offsetHeight)
    if (!opts.enabled || width < LENS_MIN_PX || height < LENS_MIN_PX) {
      clear()
      return
    }
    const style = getComputedStyle(el)
    const cssRadius = Number.parseFloat(style.borderTopLeftRadius) || 0
    const radius = Math.round(Math.min(opts.radius ?? cssRadius, width / 2, height / 2))
    const corner = opts.corner ?? cornerExponent(style.getPropertyValue('corner-top-left-shape'))
    const bezel = Math.round(Math.max(4, Math.min(opts.rim, Math.min(width, height) / 3.5)))
    const split = opts.dispersion > 0
    /* 整图贴图的尺寸参与 key：尺寸变化必须重新生成，不能只移动贴图 */
    const key = `${radius}:${bezel}:${corner.toFixed(3)}:${opts.power.toFixed(3)}:${split}:${opts.fullMap ? `${width}x${height}` : ''}`
    api.bezel = bezel
    if (current?.key === key) {
      if (current.width !== width || current.height !== height) {
        placeFilter(current.lens, width, height)
        current.width = width
        current.height = height
      }
      setScale(current.lens, bezel)
      return
    }
    const now = performance.now()
    const settling = current && now - lastChange < SETTLE_MS
    lastChange = now
    if (settling) {
      if (current.width !== width || current.height !== height) {
        placeFilter(current.lens, width, height)
        current.width = width
        current.height = height
      }
      setScale(current.lens, bezel)
      clearTimeout(settle)
      settle = setTimeout(schedule, SETTLE_MS)
      return
    }
    // 新贴图可能要几帧才就绪；期间先用旧镜头覆盖新尺寸，避免表面缺角
    if (current && (current.width !== width || current.height !== height)) {
      placeFilter(current.lens, width, height)
      current.width = width
      current.height = height
      setScale(current.lens, bezel)
    }
    const mine = ++token
    const tiles = opts.fullMap
      ? await fullMap(width, height, radius, bezel, corner, opts.power)
      : await lensTiles(radius, bezel, corner, opts.power)
    if (mine !== token) return
    const lens = buildFilter(width, height, tiles, split, opts.fullMap)
    setScale(lens, bezel)
    const previous = current
    current = { key, lens, width, height }
    el.style.setProperty(opts.property, `url(#${lens.id})`)
    // 让新滤镜先绘制，再移除旧滤镜
    if (previous) requestAnimationFrame(() => requestAnimationFrame(() => previous.lens.host.remove()))
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(fit)
  }

  const observer = new ResizeObserver(schedule)
  observer.observe(el)

  function destroy() {
    observer.disconnect()
    cancelAnimationFrame(frame)
    clearTimeout(settle)
    clear()
  }

  schedule()
  return api
}

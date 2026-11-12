/*
 * 液态玻璃边缘折射 —— 位移贴图生成
 * 移植自 Glasswork (https://github.com/kubai087/glasswork, MIT License)
 * 原文件 lens.js 的几何 / 贴图部分，按项目 400 行红线拆分。
 *
 * 折射贴图是九宫格镜头：只有边缘弯曲，中间平整，因此可以用
 * 四角贴图 + 四条 1px 边带（沿边拉伸）组成，不必为整块玻璃生成逐像素图。
 */

// 圆形圆角的指数（CSS corner-shape: round）
export const ROUND_CORNER = 2

// 小于这个尺寸的表面没有可透视的平整中区
export const LENS_MIN_PX = 32

// 贴图缓存上限（按 圆角:边宽:角指数:衰减 键控，每种参数只生成一次）
const TILE_CACHE_MAX = 48

// 边缘弯曲的强度：距边缘 depth（0 外沿，1 内沿）处的保留比例
function rimStrength(depth, power) {
  return depth >= 1 ? 0 : (1 - Math.max(0, depth)) ** power
}

// 从外轮廓（depth 0）到内轮廓（depth 1）的半径：比边宽更紧的圆角
// 会把内轮廓向外扩成与边宽同宽，使弯曲平滑转过拐角而不是沿对角线突变
function contourRadius(depth, radius, bezel) {
  if (radius >= bezel) return radius - depth * bezel
  return (1 - depth) * (radius + (bezel - radius) * depth * (2 - depth))
}

function isWithinContour(x, y, depth, radius, bezel, corner) {
  const inset = depth * bezel
  if (x < inset || y < inset) return false
  const curve = contourRadius(depth, radius, bezel)
  const center = inset + curve
  if (x >= center || y >= center) return true
  return ((center - x) / curve) ** corner + ((center - y) / curve) ** corner <= 1
}

// 距拐角两条边 (x, y) 处的向内弯曲向量
function bendNearCorner(x, y, radius, bezel, corner, power) {
  if (isWithinContour(x, y, 1, radius, bezel, corner)) return [0, 0]
  let depth = 0
  if (isWithinContour(x, y, 0, radius, bezel, corner)) {
    // 轮廓层层嵌套，二分 14 次即定位到 1/16000 边宽精度（细于一像素）
    let low = 0
    let high = 1
    for (let step = 0; step < 14; step += 1) {
      const middle = (low + high) / 2
      if (isWithinContour(x, y, middle, radius, bezel, corner)) low = middle
      else high = middle
    }
    depth = low
  }
  const strength = rimStrength(depth, power)
  const curve = contourRadius(depth, radius, bezel)
  const center = depth * bezel + curve
  if (x < center && y < center && curve > 0) {
    // 拐角曲线上：沿法线方向
    const nx = Math.max(0, (center - x) / curve) ** (corner - 1)
    const ny = Math.max(0, (center - y) / curve) ** (corner - 1)
    const length = Math.hypot(nx, ny) || 1
    return [(nx / length) * strength, (ny / length) * strength]
  }
  return x < y ? [strength, 0] : [0, strength]
}

// 指定点的向内偏移：单位方向 × 强度（外沿为 1，平整中区为 0）
export function rimDisplacement(x, y, width, height, { bezel, radius, corner = ROUND_CORNER, power }) {
  const rim = Math.min(bezel, height / 2, width / 2)
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const [inwardX, inwardY] = bendNearCorner(Math.min(x, width - x), Math.min(y, height - y), r, rim, corner, power)
  if (inwardX === 0 && inwardY === 0) return [0, 0]
  return [x < width / 2 ? inwardX : -inwardX, y < height / 2 ? inwardY : -inwardY]
}

// 各贴图在给定尺寸表面上的落位：四角 → 四边（上、下、左、右）
export function lensLayout(width, height, size) {
  const across = Math.max(1, width - size * 2)
  const down = Math.max(1, height - size * 2)
  return [
    [0, 0, size, size],
    [width - size, 0, size, size],
    [0, height - size, size, size],
    [width - size, height - size, size, size],
    [size, 0, across, size],
    [size, height - size, across, size],
    [0, size, size, down],
    [width - size, size, size, down],
  ]
}

// 用比两块贴图宽 1px 的探针表面读取像素：红 = 水平弯曲，绿 = 垂直弯曲，128 为无
function tilePixels(radius, bezel, corner, power) {
  const size = Math.max(1, Math.ceil(Math.max(radius, bezel)))
  const probe = size * 2 + 1
  const geometry = { bezel, radius, corner, power }
  return {
    size,
    tiles: lensLayout(probe, probe, size).map(([left, top, w, h]) => {
      const data = new Uint8ClampedArray(w * h * 4)
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const [dx, dy] = rimDisplacement(left + x + 0.5, top + y + 0.5, probe, probe, geometry)
          const i = (y * w + x) * 4
          data[i] = Math.round(128 + dx * 127)
          data[i + 1] = Math.round(128 + dy * 127)
          data[i + 2] = 128
          data[i + 3] = 255
        }
      }
      return { width: w, height: h, data }
    }),
  }
}

// 每种边缘参数解码后的 PNG 贴图（滤镜图片未解码完成时 Chromium 会不画模糊，
// 所以这里等 decode 完成才返回）
const tileCache = new Map()

export function lensTiles(radius, bezel, corner, power) {
  const key = `${radius}:${bezel}:${corner.toFixed(3)}:${power.toFixed(3)}`
  const hit = tileCache.get(key)
  if (hit) {
    // 最近使用移到末尾
    tileCache.delete(key)
    tileCache.set(key, hit)
    return hit
  }
  const { size, tiles } = tilePixels(radius, bezel, corner, power)
  // toBlob 在主线程外压缩；生成后以 object URL 保留至页面存活
  const entry = Promise.all(tiles.map((tile) => {
    const canvas = document.createElement('canvas')
    canvas.width = tile.width
    canvas.height = tile.height
    const context = canvas.getContext('2d')
    const image = context.createImageData(tile.width, tile.height)
    image.data.set(tile.data)
    context.putImageData(image, 0, 0)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png')).then(async (blob) => {
      const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')
      const decoded = new Image()
      decoded.src = url
      await decoded.decode().catch(() => {})
      return url
    })
  })).then((urls) => ({ size, urls }))
  tileCache.set(key, entry)
  while (tileCache.size > TILE_CACHE_MAX) tileCache.delete(tileCache.keys().next().value)
  return entry
}

// 整张位移图：小尺寸面板用。九宫格把边带贴图拉伸拼接，接缝处会出现一条
// “无位移”的细线；整图按元素尺寸逐像素生成，没有拼接也就没有接缝。
// 只适合小面板（下拉/浮层），整页玻璃仍用九宫格以控制开销。
const fullCache = new Map()
const FULL_CACHE_MAX = 8

export function fullMap(width, height, radius, bezel, corner, power) {
  const key = `${width}x${height}:${radius}:${bezel}:${corner.toFixed(3)}:${power.toFixed(3)}`
  const hit = fullCache.get(key)
  if (hit) {
    fullCache.delete(key)
    fullCache.set(key, hit)
    return hit
  }
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [dx, dy] = rimDisplacement(x + 0.5, y + 0.5, width, height, { bezel, radius, corner, power })
      const i = (y * width + x) * 4
      data[i] = Math.round(128 + dx * 127)
      data[i + 1] = Math.round(128 + dy * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  const entry = (async () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    const image = context.createImageData(width, height)
    image.data.set(data)
    context.putImageData(image, 0, 0)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')
    const decoded = new Image()
    decoded.src = url
    await decoded.decode().catch(() => {})
    return { url }
  })()
  fullCache.set(key, entry)
  while (fullCache.size > FULL_CACHE_MAX) fullCache.delete(fullCache.keys().next().value)
  return entry
}

// CSS corner-shape 的圆角指数：round 即圆，squircle 为 superellipse(2)
export function cornerExponent(shape) {
  const value = String(shape || '').trim()
  if (value === 'squircle') return 4
  const match = /^superellipse\(\s*([^)\s]+)\s*\)$/.exec(value)
  const k = match ? Number(match[1]) : Number.NaN
  return Number.isFinite(k) && k >= 0 ? 2 ** k : ROUND_CORNER
}

// ============================================================
// 时钟 / 农历 / 日期格式化 / 自动适配时间日期颜色
// 依赖：state/ui/toast（state.js）、save（persistence.js）、resolvedTheme（theme.js）、WEEKS（constants.js）
// 副作用（模块加载即注册）：时钟定时器、农历星期 watch、自动配色 watch
// ============================================================
import { computed, watch } from 'vue'
import { state, ui } from './state'
import { save } from './persistence'
import { resolvedTheme } from './theme'
import { WEEKS } from './constants'

/* ---------- 时钟 ---------- */
let clockTimer = null
function startClock() {
  clearInterval(clockTimer)
  // 显示秒时高频刷新，否则低频即可（降低 CPU / 渲染开销）
  clockTimer = setInterval(() => { ui.now = new Date() }, state.showSeconds ? 250 : 1000)
}
startClock()
watch(state.showSeconds, startClock)

/* ---------- 农历（公历 → 农历，1900-2100 查表） ---------- */
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
]
const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊']
const LUNAR_DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0 }
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29 }
function lunarYearDays(y) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0
  return sum + lunarLeapDays(y)
}
function solarToLunar(date) {
  const base = Date.UTC(1900, 0, 31)
  let offset = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - base) / 86400000)
  let temp = 0, y = 1900
  for (; y < 2101 && offset > 0; y++) { temp = lunarYearDays(y); offset -= temp }
  if (offset < 0) { offset += temp; y-- }
  const leap = lunarLeapMonth(y)
  let isLeap = false, m = 1
  for (; m < 13 && offset > 0; m++) {
    if (leap > 0 && m === leap + 1 && !isLeap) { --m; isLeap = true; temp = lunarLeapDays(y) }
    else { temp = lunarMonthDays(y, m) }
    if (isLeap && m === leap + 1) isLeap = false
    offset -= temp
  }
  if (offset === 0 && leap > 0 && m === leap + 1) {
    if (isLeap) isLeap = false
    else { isLeap = true; --m }
  }
  if (offset < 0) { offset += temp; --m }
  return { year: y, month: m, day: offset + 1, isLeap }
}

export function formatDate(d, fmt) {
  const y = d.getFullYear(), mo = d.getMonth(), da = d.getDate(), wd = d.getDay()
  const p = n => String(n).padStart(2, '0')
  switch (fmt) {
    case 'cn-long': return `${y}年${mo + 1}月${da}日 星期${WEEKS[wd]}`
    case 'cn-short': return `${y}-${p(mo + 1)}-${p(da)} 周${WEEKS[wd]}`
    case 'en-long': return `${WEEK_EN[wd]}, ${MONTH_EN[mo]} ${da}, ${y}`
    case 'numeric': return `${p(mo + 1)}/${p(da)} 周${WEEKS[wd]}`
    case 'weekday': return `星期${WEEKS[wd]}`
    case 'lunar': {
      const l = solarToLunar(d)
      return `农历${l.isLeap ? '闰' : ''}${LUNAR_MONTHS[l.month - 1]}月${LUNAR_DAYS[l.day - 1]}`
    }
    default: return `${y}年${mo + 1}月${da}日 星期${WEEKS[wd]}`
  }
}
/* ---------- 自动适配时间/日期颜色（开关，换壁纸动态调整） ---------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
  }
  return [h, s, l]
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 1 / 6) [r, g, b] = [c, x, 0]
  else if (h < 2 / 6) [r, g, b] = [x, c, 0]
  else if (h < 3 / 6) [r, g, b] = [0, c, x]
  else if (h < 4 / 6) [r, g, b] = [0, x, c]
  else if (h < 5 / 6) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}
/* 从壁纸提取主色 / 次色 / 平均色（按色相分桶取像素最多的两簇，跳过灰暗色） */
function sampleWallpaperPalette(src) {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 40; c.height = 40
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 40, 40)
      try {
        const d = ctx.getImageData(0, 0, 40, 40).data
        const buckets = {}, avg = [0, 0, 0]
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          avg[0] += r; avg[1] += g; avg[2] += b; n++
          const [h, s] = rgbToHsl(r, g, b)
          if (s < 0.2) continue
          const idx = Math.floor(h / 30) % 12
          const bk = buckets[idx] || (buckets[idx] = { r: 0, g: 0, b: 0, n: 0 })
          bk.r += r; bk.g += g; bk.b += b; bk.n++
        }
        const keys = Object.keys(buckets).sort((a, b) => buckets[b].n - buckets[a].n)
        const mk = k => buckets[k] ? [Math.round(buckets[k].r / buckets[k].n), Math.round(buckets[k].g / buckets[k].n), Math.round(buckets[k].b / buckets[k].n)] : null
        res({ dominant: mk(keys[0]), secondary: mk(keys[1]), average: [Math.round(avg[0] / n), Math.round(avg[1] / n), Math.round(avg[2] / n)] })
      } catch (e) { res(null) }
    }
    img.onerror = () => res(null)
    img.src = src
  })
}
/* 时间取主色、日期取次色：保留色相/饱和度，仅把亮度调到目标区间（亮壁纸→深色文字，暗壁纸→亮色文字），保证可读且颜色鲜明 */
export async function autoFitClockColors() {
  let pal = null
  if (state.wallpaper && state.wallpaperType !== 'video') pal = await sampleWallpaperPalette(state.wallpaper)
  const fallback = resolvedTheme.value === 'dark' ? '#f2fdfb' : '#0d2b2e'
  if (!pal || !pal.dominant) { state.clockColor = fallback; state.dateColor = fallback; save(); return }
  const toColor = c => {
    const [h, s, l] = rgbToHsl(c[0], c[1], c[2])
    return hslToRgb(h, Math.max(0.25, s), l > 0.55 ? 0.32 : 0.78)
  }
  state.clockColor = toColor(pal.dominant)
  state.dateColor = pal.secondary ? toColor(pal.secondary) : state.clockColor
  save()
}
/* 壁纸 / 开关变化：自动适配开启则动态重算 */
watch(() => [state.wallpaper, state.wallpaperType, state.autoColor], () => { if (state.autoColor) autoFitClockColors() })

export const clockParts = () => {
  const d = ui.now
  let h = d.getHours(), am = ''
  if (state.hour12) { am = h < 12 ? '上午' : '下午'; h = h % 12 || 12 }
  return {
    h: String(h).padStart(2, '0'),
    m: String(d.getMinutes()).padStart(2, '0'),
    s: String(d.getSeconds()).padStart(2, '0'),
    am,
    date: formatDate(d, state.dateFormat)
  }
}

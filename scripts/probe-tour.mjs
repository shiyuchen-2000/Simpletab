import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800']
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
const logs = []
page.on('console', m => logs.push(m.text()))
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await new Promise(r => setTimeout(r, 500))

/* 注入探针 */
await page.evaluate(() => {
  window.__probe = { ga: [], ro: 0, domMoves: [] }
  const origGA = Element.prototype.getAnimations
  Element.prototype.getAnimations = function () {
    const r = origGA.call(this)
    if (this.classList && this.classList.contains('overlay-form'))
      window.__probe.ga.push({ t: Date.now(), n: r.length })
    return r
  }
  const OrigRO = window.ResizeObserver
  window.ResizeObserver = class extends OrigRO {
    constructor(cb) { super(cb); window.__probe.ro++ }
  }
  /* 观察挖洞 style 变化 */
  new MutationObserver(() => {
    const h = document.querySelector('.tour-hole')
    if (h) window.__probe.domMoves.push(h.style.top + ',' + h.style.left + ' @' + Date.now())
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] })
})

async function clickNext() { await page.click('.tour-bubble .btn-primary'); await new Promise(r => setTimeout(r, 650)) }
async function clickClock() { await page.click('#clockWrap'); await new Promise(r => setTimeout(r, 900)) }

/* 进入引导 */
await page.click('#clockWrap'); await new Promise(r => setTimeout(r, 600))
await page.click('#gearZone'); await new Promise(r => setTimeout(r, 200))
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.dropdown .d-item')].find(x => x.textContent.includes('新手指引'))
  if (b) b.click()
})
await new Promise(r => setTimeout(r, 800))
for (let i = 0; i < 3; i++) await clickNext()
await clickClock()   // 进入第 5 步
console.log('step:', await page.$eval('.tb-title', el => el.textContent).catch(() => '?'))

/* 清空探针计数，点击 + */
await page.evaluate(() => { window.__probe.ga = []; window.__probe.ro = 0; window.__probe.domMoves = [] })
await page.click('.tile.add')
await new Promise(r => setTimeout(r, 700))

const p = await page.evaluate(() => ({
  ga: window.__probe.ga,
  ro: window.__probe.ro,
  domMoves: window.__probe.domMoves.slice(-6),
  tourActive: !!document.querySelector('.tour-mask'),
  hole: (() => { const h = document.querySelector('.tour-hole'); return h ? h.getBoundingClientRect().toJSON() : null })(),
  holeStyle: (() => { const h = document.querySelector('.tour-hole'); return h ? h.getAttribute('style') : null })(),
  form: (() => { const f = document.querySelector('.overlay-form'); return f ? f.getBoundingClientRect().toJSON() : null })(),
  formStyle: (() => { const f = document.querySelector('.overlay-form'); return f ? f.getAttribute('style') : null })()
}))
console.log(JSON.stringify(p, null, 1))
console.log('--- console ---')
console.log(logs.join('\n') || '(none)')
await browser.close()

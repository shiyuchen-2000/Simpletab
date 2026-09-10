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

const snap = () => page.evaluate(() => {
  const form = document.querySelector('.overlay-form')
  return {
    formDisplay: form ? getComputedStyle(form).display : 'no-form',
    formVisible: form ? form.getBoundingClientRect().width > 0 : false,
    hole: (() => { const h = document.querySelector('.tour-hole'); return h ? h.getBoundingClientRect().toJSON() : null })(),
    tourTitle: (() => { const t = document.querySelector('.tb-title'); return t ? t.textContent : null })(),
    view: document.querySelector('#linksSection').classList.contains('hidden') ? 'home' : 'links'
  }
})

async function clickNext() { await page.click('.tour-bubble .btn-primary'); await new Promise(r => setTimeout(r, 650)) }

/* 进入引导 */
await page.evaluate(() => document.getElementById('clockWrap').click())
await new Promise(r => setTimeout(r, 600))
await page.click('#gearZone'); await new Promise(r => setTimeout(r, 200))
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.dropdown .d-item')].find(x => x.textContent.includes('新手指引'))
  if (b) b.click()
})
await new Promise(r => setTimeout(r, 800))
for (let i = 0; i < 3; i++) await clickNext()

console.log('BEFORE clock click (step4):', JSON.stringify(await snap()))
/* 用 DOM click 避免被气泡遮挡 */
await page.evaluate(() => document.getElementById('clockWrap').click())
await new Promise(r => setTimeout(r, 900))
console.log('AFTER clock click (step5?):', JSON.stringify(await snap()))

/* 再等，看是否 form 有变化 */
await new Promise(r => setTimeout(r, 800))
console.log('LATER +0.8s:', JSON.stringify(await snap()))

await browser.close()

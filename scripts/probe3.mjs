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
    hole: (() => { const h = document.querySelector('.tour-hole'); return h ? h.getBoundingClientRect().toJSON() : null })(),
    add: (() => { const a = document.querySelector('.tile.add'); return a ? a.getBoundingClientRect().toJSON() : null })()
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
await page.evaluate(() => document.getElementById('clockWrap').click())
await new Promise(r => setTimeout(r, 900))

console.log('STEP5 before + click:', JSON.stringify(await snap()))

/* 用 DOM click 点击 + 磁贴 */
await page.evaluate(() => document.querySelector('.tile.add').click())
await new Promise(r => setTimeout(r, 700))
console.log('STEP5 after + click (0.7s):', JSON.stringify(await snap()))
await new Promise(r => setTimeout(r, 1000))
console.log('STEP5 after + click (+1s):', JSON.stringify(await snap()))

console.log('--- TD logs ---')
console.log(logs.filter(l => l.includes('[TD]')).join('\n'))
await browser.close()

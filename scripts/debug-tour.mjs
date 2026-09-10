import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800']
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })

const logs = []
page.on('console', m => logs.push(m.text()))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await new Promise(r => setTimeout(r, 600))

/* 先进入链接页才能看到齿轮 → 打开下拉 → 点「新手指引」 */
await page.click('#clockWrap')
await new Promise(r => setTimeout(r, 600))
await page.click('#gearZone')
await new Promise(r => setTimeout(r, 200))
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.dropdown .d-item')]
  const b = btns.find(x => x.textContent.includes('新手指引'))
  if (b) b.click()
})
await new Promise(r => setTimeout(r, 800))

/* 第 1~3 步：点「下一步」 */
for (let i = 0; i < 3; i++) {
  await page.click('.tour-bubble .btn-primary')
  await new Promise(r => setTimeout(r, 700))
}
console.log('step title now:', await page.$eval('.tb-title', el => el.textContent).catch(() => '?'))

/* 第 4 步：点时间区域进入链接页（expect 自动前进到第 5 步） */
await page.click('#clockWrap')
await new Promise(r => setTimeout(r, 900))
console.log('step title now:', await page.$eval('.tb-title', el => el.textContent).catch(() => '?'))

/* 记录点击 + 前的挖洞与磁贴位置 */
const before = await page.evaluate(() => {
  const hole = document.querySelector('.tour-hole')
  const add = document.querySelector('.tile.add')
  const h = hole ? hole.getBoundingClientRect().toJSON() : null
  const a = add ? add.getBoundingClientRect().toJSON() : null
  return { hole: h, add: a }
})
console.log('BEFORE click add:', JSON.stringify(before, null, 1))

/* 点击 + 磁贴 */
await page.click('.tile.add')
await new Promise(r => setTimeout(r, 500))

/* 记录点击 + 后的挖洞与表单位置 */
const after = await page.evaluate(() => {
  const hole = document.querySelector('.tour-hole')
  const form = document.querySelector('.overlay-form')
  const h = hole ? hole.getBoundingClientRect().toJSON() : null
  const f = form ? form.getBoundingClientRect().toJSON() : null
  const fVisible = form ? getComputedStyle(form).display : 'no-form'
  return { hole: h, form: f, fDisplay: fVisible }
})
console.log('AFTER  click add:', JSON.stringify(after, null, 1))

/* 等更久再看一次（确认是否动画后更新） */
await new Promise(r => setTimeout(r, 800))
const later = await page.evaluate(() => {
  const hole = document.querySelector('.tour-hole')
  return hole ? hole.getBoundingClientRect().toJSON() : null
})
console.log('LATER (after +0.8s):', JSON.stringify(later))

console.log('--- console logs ---')
console.log(logs.filter(l => l.includes('error') || l.includes('Error')).join('\n') || '(none)')

await browser.close()

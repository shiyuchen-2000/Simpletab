# 代码组织规则（可加入 CLAUDE.md 的内容）

> 本文档是一段**可直接粘贴进 CLAUDE.md** 的代码组织规则。
> 目的：从事后拆巨型文件，转为**事前用结构约束**，让 AI 生成代码时天然遵守文件边界。

---

## 直接粘贴到 CLAUDE.md 的内容

```markdown
## 代码组织与文件边界（新增功能必须遵守）

1. **文件大小红线**：单个源文件（js/vue/css）接近 400 行时，先拆分再新增，禁止继续堆积。
   超过 400 行必须开新文件或重构。

2. **按领域落位**：新增代码先判断"属于哪个领域"，写入职责匹配的文件；
   不存在"everything.js"——新领域直接建新文件（即使很小），不要 append 到最大文件。

3. **新增前先看结构**：开始任何改动前，先看 src/ 目录结构与该模块现有文件，
   优先复用既有文件，其次建新文件，绝不随手塞进无关文件。

4. **纯函数与副作用分离**：纯逻辑（无 state/无 DOM 副作用）独立成小模块，
   便于单独测试与日后拆分。

5. **模块间只通过 import 显式依赖**，不依赖全局变量、不跨文件写共享状态。

6. **一个文件出现多个不相关职责时**：在本次改动中顺手拆分（零成本时刻），
   而不是留给"以后重构"。
```

---

## 配套：可选的文件大小检查脚本

加到 `package.json` 的 `build` 前（如 `"build": "node scripts/check-filesize.mjs && vite build"`），
让超红线在发生时就被看见：

```js
// scripts/check-filesize.mjs
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = 'src'
const LIMIT = 400
const walk = dir => readdirSync(dir).flatMap(n => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
let bad = 0
for (const f of walk(ROOT).filter(f => /\.(js|vue|css)$/.test(f))) {
  const n = readFileSync(f, 'utf8').split('\n').length
  if (n > LIMIT) { console.warn(`⚠️  ${relative(process.cwd(), f)}: ${n} 行，超过红线 ${LIMIT}`); bad++ }
}
if (bad) { console.warn(`共 ${bad} 个文件超红线，建议拆分后再继续`); process.exit(1) }
```

> 想宽松就先 `console.warn` 不退出（`exit(1)` 去掉），只提示不阻断。

---

## 判断口诀

> **新增代码先问"属于哪个领域"，文件接近 400 行先拆再写，纯函数独立成模块。**

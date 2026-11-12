// ============================================================
// 链接联想：按标题相似度匹配链接页内的链接（含文件夹内链接）
// 纯函数，无副作用；UI 与键盘交互在 SearchBar / SearchSuggest 中
// ============================================================

/* 标题匹配分数：
   完全相等 > 前缀 > 包含 > 子序列（输入字符按顺序出现在标题中）。
   0 表示不匹配。子序列要求输入长度至少达到标题的 50%，避免单字乱联想 */
function titleScore(title, q) {
  const t = title.toLowerCase()
  if (!t || !q) return 0
  if (t === q) return 130
  if (t.startsWith(q)) return 100 + (q.length / t.length) * 20
  if (t.includes(q)) return 80 + (q.length / t.length) * 15
  let i = 0
  for (const ch of t) {
    if (i < q.length && ch === q[i]) i += 1
  }
  if (i === q.length) {
    const coverage = q.length / t.length
    if (coverage >= 0.5) return 45 + coverage * 25
  }
  return 0
}

/*
 * matchLinks(query, links, folders, limit)
 * 返回 [{ link, folder, score }]，按分数降序；folder 为所属文件夹标题（根级为空串）。
 */
export function matchLinks(query, links, folders, limit = 6) {
  const q = String(query || '').trim().toLowerCase()
  if (!q || !Array.isArray(links)) return []
  const folderName = new Map((folders || []).map(f => [f.id, f.title]))
  const scored = []
  for (const link of links) {
    const score = titleScore(String(link.title || ''), q)
    if (score > 0) {
      scored.push({
        link,
        folder: link.folderId ? (folderName.get(link.folderId) || '') : '',
        score
      })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

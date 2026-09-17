# SimpleTab 宣传网页（site/）

SimpleTab 简页的官方宣传页，与扩展源码同仓库、独立目录、互不影响构建。

## 本地预览

纯静态页面，无依赖、无构建。任选一种方式起本地静态服务器：

```bash
# 方式一：Python
cd site && python -m http.server 8080

# 方式二：Node（若本机装有 npx）
cd site && npx serve
```

然后打开 `http://localhost:8080`。

> 直接用浏览器打开 `site/index.html` 也能看，但部分浏览器对 `file://` 下的资源有跨域限制，建议起服务器预览。

## 部署

目录本身即可作为静态站点根目录：

- **Cloudflare Pages**：构建命令留空（纯静态），发布目录填 `site`
- **Netlify / Vercel / GitHub Pages**：同理，把 `site/` 设为站点根目录

## 目录结构

```
site/
├── index.html       # 单页宣传页（结构已就绪，内容待填充）
├── assets/
│   ├── style.css    # 样式（暗色极光 · teal 主题，与产品一致）
│   └── main.js      # 交互脚本
└── README.md
```

## 与扩展的关系

- 扩展构建（`npm run build` → `dist/`）与本站完全独立，互不干扰
- 本目录内所有资源**自包含**（logo 用内联 SVG），不依赖扩展的 `public/`，可独立部署

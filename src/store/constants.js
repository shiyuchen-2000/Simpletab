// ============================================================
// 常量：搜索引擎 / 星期 / 字体（纯数据，无依赖）
// ============================================================

/* 默认搜索引擎：存于 state.engines（响应式、可增删改），编辑结果同步到搜索框引擎胶囊与下拉 */
export const DEFAULT_ENGINES = [
  { key: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}' },
  { key: 'bing', name: '必应', url: 'https://www.bing.com/search?q={q}' },
  { key: 'google', name: '谷歌', url: 'https://www.google.com/search?q={q}' },
  { key: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query={q}' }
]
export const WEEKS = ['日', '一', '二', '三', '四', '五', '六']
export const GENERIC_FONTS = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy']
export const FALLBACK_FONTS = [
  'system-ui', 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Segoe UI', 'Noto Sans SC', 'Source Han Sans SC',
  'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'STSong', 'STKaiti', 'Songti SC', 'Heiti SC', 'Microsoft JhengHei',
  'Arial', 'Helvetica Neue', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
  'Roboto', 'Calibri', 'Cambria', 'Candara', 'Corbel', 'Constantia', 'Consolas', 'Courier New', 'Cascadia Mono',
  'Bahnschrift', 'Aptos', 'Segoe UI Variable', 'Sitka', 'Gabriola', 'Palatino Linotype', 'Book Antiqua',
  'Bookman Old Style', 'Garamond', 'Gill Sans MT', 'Lucida Console', 'Lucida Sans Unicode', 'Lucida Sans',
  'Lucida Handwriting', 'OCR A Extended', 'Rockwell', 'Segoe Script', 'Segoe Print', 'Copperplate Gothic',
  'Franklin Gothic Medium', 'Haettenschweiler', 'Marlett', 'Symbol', 'Webdings', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
  'Nirmala UI', 'Leelawadee UI', 'Malgun Gothic', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'MS PGothic',
  'MS UI Gothic', 'UD Digi Kyokasho N-R', 'HiraKakuProN-W3', 'Hiragino Sans GB', 'Gulim', 'Batang', 'Dotum',
  'Baskerville', 'Didot', 'Futura', 'Optima', 'Papyrus', 'Gill Sans', 'Hoefler Text', 'American Typewriter',
  'Courier', 'Monaco', 'Menlo', 'SF Mono', 'SF Pro Text', 'SF Pro Display', 'Apple Color Emoji', 'Segoe UI Emoji',
  'Segoe UI Symbol', 'DengXian', '等线', 'Ebrima', 'Gadugi', 'Ink Free', 'Javanese Text', 'Khmer UI',
  'Lao UI', 'Microsoft Himalaya', 'Microsoft New Tai Lue', 'Microsoft PhagsPa',
  'Microsoft Tai Le', 'Microsoft Yi Baiti', 'Mongolian Baiti', 'Myanmar Text', 'Nyala', 'Plantagenet Cherokee',
  'Segoe MDL2 Assets', 'SimSun-ExtB', 'Sylfaen', 'Tlwg Typist', 'Yu Mincho', 'PMingLiU',
  'MingLiU', 'DFKai-SB', '標楷體', 'TW-Kai', 'AR PL UKai CN', 'AR PL UMing CN', 'WenQuanYi Micro Hei',
  'WenQuanYi Zen Hei', 'Noto Serif SC', 'Noto Serif CJK SC', 'Source Han Serif SC', '思源宋体',
  /* 常见第三方字体（是否真的已安装由 Canvas 探测，未安装会被自动过滤） */
  'Inter', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Raleway', 'Oswald',
  'Merriweather', 'Playfair Display', 'Public Sans', 'Source Sans 3', 'Source Serif 4',
  'Source Code Pro', 'JetBrains Mono', 'Fira Code', 'Fira Sans',
  'IBM Plex Sans', 'IBM Plex Mono', 'IBM Plex Serif', 'Space Grotesk', 'Manrope', 'DM Sans', 'Work Sans',
  'Noto Sans', 'Noto Serif', 'Noto Sans Mono', 'Noto Sans CJK SC',
  'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'Liberation Sans', 'Liberation Serif', 'Liberation Mono',
  'Sarasa Gothic SC', 'HarmonyOS Sans SC', 'MiSans', 'MiSans VF', 'Mi Sans', 'Alibaba PuHuiTi 3.0', 'Alibaba PuHuiTi'
]

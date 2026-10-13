// ============================================================
// store 汇聚出口：加载全部领域模块（各模块顶层副作用：watchEffect /
// 事件监听 / 定时器，随 import 即注册）并对外重导出。
// 对外 API 与拆分前完全一致——所有组件仍从 '../store' 导入，零改动。
// ============================================================
export * from './constants'
export * from './utils'
export * from './state'
export * from './persistence'
export * from './theme'
export * from './layout'
export * from './clock'
export * from './fonts'
export * from './search'
export * from './presets'
export * from './folders'
export * from './links'
export * from './interactions'
export * from './wallpaper'
export * from './reset'

// 纯副作用模块（无导出）：材质与质感微调 / 动画维度 dataset
import './tune'

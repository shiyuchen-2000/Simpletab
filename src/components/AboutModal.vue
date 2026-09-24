<script setup>
import { ref, watch, nextTick } from 'vue'
import { ui } from '../store'
import { useGearModal } from '../store/useGearModal'

/* 更新日志：新版本在上。items 为 { t, tag }，tag: 'new' 新增（绿）/ 'fix' 修复（黄），缺省无标签 */
const CHANGES = [
  {
    ver: 'v1.7.0',
    items: [
      { t: '页面布局：时钟 / 搜索框 / 拓展坞独立定位，全屏拖拽编辑器，位置预设自动错开', tag: 'new' },
      { t: '文件夹壁纸轮换：批量导入图片，支持每次打开随机 / 定时更换', tag: 'new' },
      { t: '实时预览：进入真实页面查看效果（仅可切换视图 / 打开文件夹）', tag: 'new' },
      { t: '设置弹窗重构：左侧目录分组导航，外观预设 / 页面布局入目录', tag: 'new' },
      { t: '自定义外观预设：一键保存当前设置，可命名描述、应用与删除（二次确认）', tag: 'new' },
      { t: '图标拖拽实时换位、视频壁纸上限提升至 500MB、自适应图标字母背景', tag: 'new' },
      { t: 'Firefox（MV3）兼容与空格唤起搜索', tag: 'new' },
      { t: '设置弹窗偶发打不开（watch 导入缺失）', tag: 'fix' },
      { t: '文件夹切换闪现、时钟避让下拉错位、位置预设重叠', tag: 'fix' },
      { t: '导入导出包含元素布局', tag: 'fix' }
    ]
  },
  {
    ver: 'v1.5.1',
    items: [
      { t: '设置左侧「悬浮目录」：窗口外纯文字导航，点击定位分组，滚动联动高亮', tag: 'new' },
      { t: '日期「农历」格式（1900-2100 查表）', tag: 'new' },
      { t: '「自动适配颜色」开关：按壁纸识别主色 / 次色，时间与日期分别着色', tag: 'new' },
      { t: '图标形状「半圆角」对角异形，小图标下与圆形更易区分' },
      { t: '移除齿轮拖拽，解决偶发「点击设置无响应」', tag: 'fix' },
      { t: '设置目录滚动到底未高亮最后一个分组', tag: 'fix' }
    ]
  },
  {
    ver: 'v1.5.0',
    items: [
      { t: '「无界」设计风格：磁贴去卡片框与毛玻璃，仅保留图标与名称', tag: 'new' },
      { t: '无界下磁贴名称支持 始终 / 悬浮 / 不显示 三态，材质类设置自动置灰' },
      { t: '「安装扩展」入口：齿轮菜单直达宣传页', tag: 'new' }
    ]
  },
  { ver: 'v1.4.0', items: [{ t: '新增搜索框 3D 动画、磁贴 / 文件夹入场动画、外观预设；修复视图切换与安全加固' }] },
  { ver: 'v1.3.0', items: [{ t: '新增 Fluent 2 设计风格（Acrylic / Mica 材质）' }] },
  { ver: 'v1.2.5', items: [{ t: '新增视频壁纸，静音循环播放，进入链接页自动暂停为静态帧' }] },
  { ver: 'v1.2.4', items: [{ t: '新增搜索引擎偏好管理，数据同步分块存储扩容' }] },
  { ver: 'v1.2.3', items: [{ t: '新增极光默认壁纸与渐变时钟，弹窗 3D 翻转，多项修复与内存优化' }] },
  { ver: 'v1.2.2', items: [{ t: '新增新手指引，添加链接表单改为相对磁贴弹出' }] },
  { ver: 'v1.2.1', items: [{ t: '新增图标本地缓存与数据管理，壁纸改 IndexedDB 原图直存' }] },
  { ver: 'v1.2.0', items: [{ t: '新增图标外观 / 悬浮动效 / 玻璃高光等外观自定义，设置界面重新分组' }] },
  { ver: 'v1.1.1', items: [{ t: '新增链接打开方式、搜索框圆角与数据云端备份' }] },
  { ver: 'v1.1.0', items: [{ t: '新增主题色自定义与实时预览，搜索引擎下拉与设置分组优化' }] },
  { ver: 'v1.0.0', items: [{ t: '首个版本：时钟、搜索、快捷链接、文件夹、壁纸、拓展坞、明暗主题' }] }
]

/* 滚动更新日志时聚焦弹窗：隐藏图标/作者，让日志占据更大空间。
   监听 changelog 自身滚动；聚焦只隐藏 hero，不改 changelog 尺寸，避免 Chromium 重置其 scrollTop 导致反复闪烁。 */
const logFocused = ref(false)
function onLogScroll(e) {
  logFocused.value = e.target.scrollTop > 0
}
watch(() => ui.modal, async v => {
  if (v === 'about') {
    logFocused.value = false
    await nextTick()
    const m = document.querySelector('.about-modal')
    if (m) m.scrollTop = 0
  }
})

/* ---------- 从设置按钮弹出 / 落回 ---------- */
const { modalRef, modalOrigin, closing, closeModal } = useGearModal('about')
</script>

<template>
  <div class="modal-backdrop" :class="{ show: ui.modal === 'about' && !closing, closing }" @click.self="closeModal">
    <div class="modal about-modal" ref="modalRef" :class="{ 'log-focus': logFocused }" :style="{ transformOrigin: modalOrigin, width: 'min(380px,92vw)' }">
      <div class="m-head" style="justify-content:flex-end;padding-bottom:.35rem;">
        <button class="m-close" @click="closeModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>

      <div class="am-hero">
        <div class="am-logo">
          <img src="/icons/icon300.png" alt="SimpleTab">
        </div>
        <div class="am-info">
          <div class="am-name">SimpleTab 简页</div>
          <div class="am-meta">
            <span class="am-chip">v1.7.0</span>
            <span>作者 · 史宇辰</span>
          </div>
        </div>
      </div>

      <div class="am-sep"></div>

      <div class="am-log-head">更新日志</div>
      <div class="changelog" @scroll="onLogScroll">
        <div v-for="c in CHANGES" :key="c.ver" class="cl-item">
          <span class="cl-ver">{{ c.ver }}</span>
          <ul>
            <li v-for="(it, i) in c.items" :key="i">
              <span v-if="it.tag" class="cl-tag" :class="it.tag === 'new' ? 'cl-new' : 'cl-fix'">{{ it.tag === 'new' ? '新增' : '修复' }}</span>
              <span>{{ it.t }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

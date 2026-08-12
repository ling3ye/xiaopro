// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Ocean Deep 深海 · Shiki 自定义高亮主题
 * 配色 1:1 对齐 demo/theme1（highlight.js 版 Ocean Deep 设计稿）：
 *   注释 #5b7a94 · 关键字 #7dd3fc · 字符串 #86efac · 数字/字面量 #fbbf24
 *   函数 #40e0cf · 类型/类 #f0abfc · 标签/属性 #93c5fd · 变量 #fda4af
 *   符号 #2dd4bf · 删除 #fb7185 · 预处理器 #c4b5fd · 正文 #d7e5f2（底 #0a1622）
 */
const oceanDeepTheme = {
  name: 'ocean-deep',
  type: 'dark',
  colors: {
    'editor.background': '#0a1622',
    'editor.foreground': '#d7e5f2',
  },
  tokenColors: [
    // 注释：灰蓝 + 斜体
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#5b7a94', fontStyle: 'italic' },
    },
    // 关键字 / 存储类型（const、int、return、import 等）：天蓝
    // 注：keyword.operator.new / typeof 等以 keyword 开头，由前缀匹配覆盖
    {
      scope: ['keyword', 'storage.type', 'storage.modifier'],
      settings: { foreground: '#7dd3fc' },
    },
    // 预处理 / 宏指令（#include、#define）：浅紫
    {
      scope: ['meta.preprocessor', 'keyword.control.directive', 'entity.name.function.preprocessor'],
      settings: { foreground: '#c4b5fd' },
    },
    // 字符串 / 正则 / 转义符 / diff 新增：青绿
    {
      scope: ['string', 'punctuation.definition.string', 'constant.character.escape', 'markup.inserted'],
      settings: { foreground: '#86efac' },
    },
    // 数字 / 字面量（true、null、NULL）/ 常量：琥珀
    {
      scope: ['constant.numeric', 'constant.language', 'constant.other', 'support.constant', 'variable.other.constant'],
      settings: { foreground: '#fbbf24' },
    },
    // 函数名 / 函数调用：青
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: '#40e0cf' },
    },
    // 类型 / 类 / 内建类型：粉紫
    {
      scope: ['entity.name.type', 'entity.name.class', 'entity.other.inherited-class', 'support.type', 'support.class'],
      settings: { foreground: '#f0abfc' },
    },
    // 标签 / 属性名 / 对象键 / 成员访问：浅蓝
    {
      scope: [
        'entity.name.tag',
        'entity.other.attribute-name',
        'support.type.property-name',
        'meta.object-literal.key',
        'variable.other.property',
        'variable.other.object.property',
        'support.variable.property',
      ],
      settings: { foreground: '#93c5fd' },
    },
    // 特殊变量（this / self / super）：玫瑰
    {
      scope: ['variable.language'],
      settings: { foreground: '#fda4af' },
    },
    // 符号 / 模板字符串插值括号：深青
    {
      scope: ['constant.other.symbol', 'punctuation.definition.template-expression'],
      settings: { foreground: '#2dd4bf' },
    },
    // 删除 / 非法：粉红
    {
      scope: ['markup.deleted', 'invalid', 'invalid.illegal'],
      settings: { foreground: '#fb7185' },
    },
    // 代码围栏内 markdown 标题兜底
    {
      scope: ['markup.heading'],
      settings: { foreground: '#7dd3fc' },
    },
    {
      scope: ['markup.bold'],
      settings: { fontStyle: 'bold' },
    },
    {
      scope: ['markup.italic'],
      settings: { fontStyle: 'italic' },
    },
  ],
};

export default defineConfig({
  // 将此处替换为你自己的购买的域名，注意要带上 https://
  site: 'https://lingflux.com/',

  // Markdown / Shiki 配置：
  // - 双主题：Paper Lab 用 github-light，Ocean Deep 用自定义 ocean-deep
  // - defaultColor: false —— token 颜色只输出 CSS 变量（--shiki-light / --shiki-dark），
  //   不写死内联 color，由全局 CSS 按 <html data-theme> 切换（见 global.css / theme-ocean.css）
  // - transformer 给每个 pre 注入 data-language（供前端生成语言徽标）
  //   并移除 Shiki 内联背景色，交由全局 CSS 控制
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: oceanDeepTheme,
      },
      defaultColor: false,
      transformers: [
        {
          name: 'code-block-meta',
          pre(node) {
            node.properties = node.properties || {};
            node.properties['data-language'] = this.options.lang || 'text';
            delete node.properties.style;
          },
        },
      ],
    },
  },

  // 绑定自定义域名通常不需要设置 base，除非你要部署在该域名的子目录下

  integrations: [
    // 多语言 sitemap：为每个 URL 生成 hreflang 备选链接
    // 输出 sitemap-index.xml（与 robots.txt 中的声明对齐）
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          'zh-cn': 'zh-CN',
          'zh-tw': 'zh-TW',
          ja: 'ja-JP',
          ko: 'ko-KR',
          es: 'es-ES',
          de: 'de-DE',
          fr: 'fr-FR',
          it: 'it-IT',
        },
      },
      // 根路径 / 是 meta-refresh 软跳转页，不放入 sitemap
      filter: (page) => page !== 'https://lingflux.com/',
    }),
  ],
});

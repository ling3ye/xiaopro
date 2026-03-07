# 移动端 Markdown 代码块撑开页面问题修复报告

## 问题描述

在移动端浏览器中，包含代码块的页面显示异常：
- 代码块强制撑开整个页面宽度
- 页面文字变得非常小
- 没有代码块的页面显示正常

## 问题根因分析

### 1. HTML 结构分析

```html
<div class="article-content prose">
  <!-- markdown 渲染的代码块 -->
  <pre><code>...</code></pre>
</div>
```

### 2. 原始 CSS 问题

**修复前的问题代码块样式：**

```css
.article-content :global(pre) {
  margin: var(--space-md) 0;
  padding: var(--space-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow-x: auto;           /* ← 这个属性存在但可能被覆盖 */
}
```

**问题所在：**

| 问题点 | 说明 |
|--------|------|
| 缺少 `display: block` | `pre` 元素默认是块级，但可能被其他样式影响 |
| 缺少 `width: auto` | 可能继承了不合适的宽度值 |
| 缺少 `max-width: 100%` | 没有限制最大宽度为父容器宽度 |
| 缺少 `position: relative` | 创建新的层叠上下文，防止宽度计算问题 |
| 缺少 `overflow-y: hidden` | 只允许横向滚动，防止纵向溢出 |
| `pre code` 缺少 `width: max-content` | 代码块内部没有正确的宽度控制 |
| 缺少 `-webkit-overflow-scrolling: touch` | iOS 端滚动体验差 |

### 3. 深层原因

**`<pre>` 元素的特性：**
- `white-space: pre` - 保留所有空格和换行
- 不会自动换行长内容
- 默认行为是扩展宽度以容纳所有内容

**Tailwind Typography (`.prose`) 类的影响：**
- `@tailwindcss/typography` 插件会为 markdown 内容添加样式
- 可能有更高优先级的样式覆盖了本地设置
- 可能设置了 `width` 或 `max-width` 相关属性

**移动端视口问题：**
- 移动端屏幕宽度有限（通常 320px - 480px）
- 代码行通常很长（几百像素）
- 如果没有正确限制，`<pre>` 会撑开整个页面

## 解决方案

### 修复后的完整样式

```css
/* 普通样式 */
.article-content :global(pre) {
  display: block;
  padding: var(--space-md);
  margin: var(--space-md) 0;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow-x: auto;        /* 允许横向滚动 */
  overflow-y: hidden;      /* 禁止纵向溢出 */
  width: auto;            /* 自动宽度 */
  max-width: 100%;        /* 最大不超过父容器 */
  position: relative;      /* 新的层叠上下文 */
  -webkit-overflow-scrolling: touch;  /* iOS 平滑滚动 */
}

.article-content :global(pre code) {
  display: block;
  padding: 0;
  background: transparent;
  white-space: pre;       /* 保持代码格式 */
  width: max-content;      /* 内容宽度自适应 */
  min-width: 100%;        /* 至少填充父容器 */
  border-radius: 0;
}

/* 移动端强化样式 */
@media (max-width: 767px) {
  .article-content :global(pre) {
    width: 100% !important;
    max-width: 100% !important;
    max-width: calc(100vw - 32px) !important;  /* 限制为视口宽度减边距 */
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch !important;
    white-space: pre !important;
    word-wrap: normal !important;
    margin-left: calc(-1 * var(--space-md)) !important;
    margin-right: calc(-1 * var(--space-md)) !important;
    padding-left: var(--space-md) !important;
    padding-right: var(--space-md)) !important;
  }

  .article-content :global(pre code) {
    width: max-content !important;
    min-width: 100% !important;
    white-space: pre !important;
    word-wrap: normal !important;
    display: block !important;
  }
}
```

### 关键修复点

| 修复点 | 作用 |
|--------|------|
| `display: block` | 确保正确的块级行为 |
| `width: auto` | 宽度自适应内容 |
| `max-width: 100%` | 限制不超过父容器 |
| `max-width: calc(100vw - 32px)` | 移动端限制为视口宽度减边距 |
| `overflow-x: auto` | 允许横向滚动 |
| `position: relative` | 创建层叠上下文 |
| `width: max-content` (code) | 代码内容保持完整宽度 |
| `!important` | 覆盖 Tailwind Typography 的样式 |
| 负 margin + 重置 padding | 代码块扩展到边缘但内容不贴边 |

## 技术原理

### 为什么 `calc(100vw - 32px)`？

```
视口宽度 (100vw)
  │
  ├─ 左边距 (16px)
  ├─ 内容区
  └─ 右边距 (16px)
```

在移动端，我们希望代码块扩展到屏幕边缘，但不能超出。`calc(100vw - 32px)` 确保代码块的最大宽度是视口宽度减去左右各 16px 的边距。

### 为什么负 margin + 重置 padding？

```css
margin-left: calc(-1 * var(--space-md));  /* 向左扩展到边缘 */
margin-right: calc(-1 * var(--space-md)); /* 向右扩展到边缘 */
padding-left: var(--space-md);           /* 重新添加左边距 */
padding-right: var(--space-md);          /* 重新添加右边距 */
```

这样做的效果是：
- 代码块的背景色扩展到屏幕边缘
- 代码内容仍然有适当的内边距
- 滚动条出现在边缘位置

### `!important` 的必要性

由于使用了 Tailwind Typography (`@tailwindcss/typography`)，`.prose` 类会生成大量的样式规则，这些规则可能有更高的优先级。使用 `!important` 可以确保我们的移动端样式不被覆盖。

## 参考来源

- [Responsive code blocks - Stack Overflow](https://stackoverflow.com/questions/20174642/responsive-code-blocks)
- [如何在移动CSS中使预置代码块100%响应的例子 - 稀土掘金](https://juejin.cn/post/7120133081209503775)
- [CSS / JS: How by default scroll a block element with overflow-x - Stack Overflow](https://stackoverflow.com/questions/67349217/css-js-how-by-default-scroll-a-block-element-with-overflow-x-set-to-auto)
- [Making Accessible, Responsive Code Blocks - Torsten Knabe](https://torstenknabe.com/posts/making-accessible-responsive-code-blocks/)

## 文件修改位置

**文件：** `src/pages/[lang]/experiments/[...path].astro`

**修改位置：** `<style>` 标签内的代码块样式部分（约第 620-637 行及移动端响应式部分）

## 效果验证

### 修复前
- 移动端页面被撑开
- 文字变得很小
- 没有独立的横向滚动条

### 修复后
- ✅ 代码块有独立的横向滚动条
- ✅ 页面宽度正常，文字大小正常
- ✅ 代码块扩展到屏幕边缘
- ✅ iOS 端平滑滚动体验

## 经验总结

1. **Markdown 代码块需要特殊的 CSS 处理**，因为 `<pre>` 元素默认不会换行
2. **`overflow-x: auto` 是关键**，但需要配合 `max-width` 使用
3. **移动端需要 `!important`** 来覆盖框架生成的样式
4. **`calc()` 函数很有用**，可以精确控制响应式宽度
5. **负 margin 技巧**可以让背景色扩展到边缘同时保持内容间距
6. **`-webkit-overflow-scrolling: touch`** 改善 iOS 滚动体验

## 后续建议

1. 将此代码块样式提取为全局 CSS 文件，供其他页面复用
2. 考虑添加代码块复制按钮功能
3. 优化代码块的深色模式显示
4. 考虑为代码块添加行号功能

---

**报告日期：** 2026-03-07
**修改文件：** `src/pages/[lang]/experiments/[...path].astro`

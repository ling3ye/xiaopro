# Lingflux.com SEO 优化计划

> 站点：https://lingflux.com
> 框架：Astro 5.17（多语言 i18n，9 种语言）
> 审计日期：2026-06-18
> 审计方式：线上 HTTP 实测 + 本地源码对照

---

## 📊 执行状态（2026-06-18 更新）

> 已完成 **8 项**（S1–S3、H2–H4、M2、M3）+ **1 项附加修复**；暂缓 **2 项**（H1、M1）。本地构建通过（617 页，`pnpm build` 绿）。

| 编号 | 状态 | 处理结果 |
| --- | --- | --- |
| **S1** | ✅ 已修复 | 安装 `@astrojs/sitemap` + i18n 配置；`sitemap-index.xml` → `sitemap-0.xml`，每个 URL 带 9 语言 hreflang 备选；根 `/` 已过滤 |
| **S2** | ✅ 已修复 | 生成 `public/og-image.png`（1200×630）；Layout 默认图路径已更新 |
| **S3** | ✅ 已修复 | Layout 输出 hreflang × 9 + `x-default`；详情页路径替换正确 |
| **H1** | ⏸ 暂缓 | 用户决定跳过；保持现状（meta-refresh 软跳转）。Cloudflare 301 方案留待将来，见第五节 |
| **H2** | ✅ 已修复 | `og:locale` 改为 `en_US` / `zh_CN` 等正确格式 + `og:locale:alternate` |
| **H3** | ✅ 已修复 | 移除指向 404 `/search` 的 `SearchAction` / `potentialAction` |
| **H4** | ✅ 已修复 | 移除全站硬编码中文 `<meta name="keywords">` |
| **M1** | ⏸ 暂缓 | Accept-Language 检测，建议随 H1 在 Cloudflare 边缘做（客户端做对 SEO 无益） |
| **M2** | ✅ 已确认 | 文章详情页本就传 `image`，72/72 文章有图；真正的 404 由 S2 修复 |
| **M3** | ✅ 已修复 | 全站输出 Organization/Logo JSON-LD；生成 `public/logo.png`（512×512）；`sameAs` 用真实社媒 |

**⚠️ 重要更正**：本计划原文假设默认语言为 `zh-cn`，但实际代码 `defaultLang = 'en'`（[config.ts:20](../src/i18n/config.ts#L20)）。因此根路径跳 `/en/`、`x-default` 指向 `/en/`、sitemap `defaultLocale` 为 `en`。**用户已确认默认语言保持英文，不做更改。**

**🔧 附加修复（计划外发现）**：8 个文章列表页漏传 `locale={currentLocale}` 给 `<Card>`，导致非中文页（`/en/`、`/de/`、`/ja/`…）的卡片按中文渲染。已补全；并将 5 个组件（Card / Layout / Footer / Sidebar / AffiliateLink）的 prop 默认值从硬编码 `'zh-cn'` 改为引用 `defaultLang`，使「默认 = 英文」全代码库一致。

---

## 一、站点概况

- **语言**：zh-cn / zh-tw / en / ja / ko / es / de / fr / it（共 9 种），定义于 [src/i18n/config.ts](../src/i18n/config.ts)
- **内容规模**：experiments 99 篇、articles 73 篇、moduleDocs 10、boardDocs 9、filaments 8、modules 11、models 4、printers 3、boards 2
- **图片 CDN**：`img.lingflux.com`
- **托管**：Cloudflare（边缘可做重定向）
- **站点配置**：`site: 'https://lingflux.com/'`（[astro.config.mjs](../astro.config.mjs)）

## 二、已做好的部分（无需改动）

| 项目 | 位置 |
| --- | --- |
| Canonical URL 每页输出 | [Layout.astro:92](../src/layouts/Layout.astro#L92) |
| 详情页 TechArticle / Article 结构化数据 | experiments & articles 详情页 |
| 面包屑 BreadcrumbList JSON-LD | [Breadcrumb.astro:57](../src/components/Breadcrumb.astro#L57) |
| 分页页 `noindex,follow` | [experiments/[...path].astro:257](../src/pages/[lang]/experiments/[...path].astro#L257) |
| robots.txt / GA4 / AdSense / 语义化 title | 全局 |

---

## 三、问题清单（按严重程度）

### 🔴 严重（阻断 / 直接报错）

#### S1. sitemap 是 404 —— 最严重　✅ 已修复
- **现象**：`robots.txt` 声明了 `https://lingflux.com/sitemap-index.xml`，实测返回 **404**。
- **原因**：`@astrojs/sitemap` 集成未安装，[astro.config.mjs](../astro.config.mjs) 未配置。
- **影响**：9 语言 × 数百页无 sitemap，Google 抓取效率大幅下降，新页面收录慢。
- **验证命令**：`curl -sI https://lingflux.com/sitemap-index.xml | head -1` → `HTTP/2 404`

#### S2. OG 分享图是 404　✅ 已修复
- **现象**：[Layout.astro:46](../src/layouts/Layout.astro#L46) 默认 `image = '/og-image.jpg'`，public 中不存在该文件，实测 **404**。
- **影响**：Twitter / Facebook / LinkedIn 分享无封面图，CTR 断崖式下降。
- **验证命令**：`curl -sI https://lingflux.com/og-image.jpg | head -1` → `HTTP/2 404`

#### S3. 完全没有 hreflang 标签　✅ 已修复
- **现象**：全站 `grep "hreflang\|rel=\"alternate\"\|x-default"` 无任何结果。
- **影响**：Google 无法判断语言-地区配对 → 重复内容判定、搜出错误语言版本、无 `x-default`。多语言站头号 SEO 问题。

### 🟠 高优先级

#### H1. 根路径 `/` 是 200 + meta refresh + JS 跳转，不是 301　⏸ 暂缓（用户决定跳过）
- **位置**：[src/pages/index.astro](../src/pages/index.astro)
- **现象**：`/` 返回 `HTTP 200`，靠 `<meta http-equiv="refresh">` + JS 跳到 `/zh-cn/`。
- **影响**：Google 视为“软重定向”，浪费抓取预算、信号被拆分。
- **验证命令**：`curl -sI https://lingflux.com/ | grep HTTP` → `HTTP/2 200`
- **⚠️ 待定决策**：根路径改为真 301（Cloudflare 边缘配置），还是直接渲染默认语言内容？见第五节。

#### H2. og:locale 格式错误　✅ 已修复
- **位置**：[Layout.astro:100](../src/layouts/Layout.astro#L100)
- **现象**：输出 `zh-cn`、`en`；Open Graph 规范要求 `zh_CN`、`en_US`（下划线 + 地区）。
- **影响**：格式不符的 locale 会被多数爬虫忽略。

#### H3. SearchAction 指向不存在的 /search　✅ 已修复
- **位置**：[src/pages/[lang]/index.astro](../src/pages/[lang]/index.astro) 的 WebSite JSON-LD `potentialAction`
- **现象**：指向 `/{lang}/search?q=...`，实测 `/zh-cn/search` 返回 **404**。
- **影响**：Search Console 会将此结构化数据标为无效。
- **验证命令**：`curl -sI https://lingflux.com/zh-cn/search | head -1` → `HTTP/2 404`

#### H4. keywords 全站硬编码中文　✅ 已修复
- **位置**：[Layout.astro:88](../src/layouts/Layout.astro#L88)
- **现象**：无论页面语言 / 内容，恒为 `硬件开发,Arduino,ESP32...`。
- **影响**：Google 已忽略 keywords，但在非中文页属噪音；建议移除或按语言/页面动态化。

### 🟡 中等

| 编号 | 问题 | 位置 | 状态 |
| --- | --- | --- | --- |
| M1 | 无 `Accept-Language` 检测，所有访客进 en | 边缘 / 客户端 | ⏸ 暂缓 |
| M2 | 文章（非实验）详情页大多不传 `image` → 回退到 404 默认图 | 各 article 详情页 | ✅ 已确认（本就传 image，404 由 S2 修复） |
| M3 | 站点级 Organization / Logo JSON-LD 缺失 | Layout | ✅ 已修复 |

---

## 四、修复计划（按 ROI 排序）

> 纯代码改动、影响最大者优先。**S1 → S2 → S3 → H1 → H2/H3/H4**
>
> **2026-06-18 进度**：S1 / S2 / S3 / H2 / H3 / H4 均已完成；H1 暂缓（见第五节）。

### 步骤 1 — 修复 S1：生成多语言 sitemap【优先】　✅ 已完成
- 安装 `@astrojs/sitemap`。
- 在 [astro.config.mjs](../astro.config.mjs) 注册集成，配置 `i18n`（localization）映射 9 语言。
- 让 sitemap 输出 `sitemap-index.xml`，与 robots.txt 已有声明对齐。
- 验证：本地 `npm run build` 后 `dist/` 出现 sitemap，线上部署后 `curl` 返回 200。

### 步骤 2 — 修复 S2：提供默认 OG 图　✅ 已完成
- 生成一张 1200×630 的默认分享图（PNG/SVG），放入 `public/og-image.png`。
- 同步更新 [Layout.astro:46](../src/layouts/Layout.astro#L46) 默认路径（如改文件名）。
- 验证：`curl -sI https://lingflux.com/og-image.png | head -1` → 200。

### 步骤 3 — 修复 S3：补全 hreflang【关键】　✅ 已完成
- 在 [Layout.astro](../src/layouts/Layout.astro) 接收全部 9 语言 + `x-default` 的 alternate 集合。
- 按当前 `currentPath` 推导每种语言的对应 URL（复用 [utils/i18n.ts](../src/utils/i18n.ts) 的 `getLocalizedPath`）。
- 输出：
  ```html
  <link rel="alternate" hreflang="zh-cn" href="https://lingflux.com/zh-cn/..." />
  ...（其余 8 语言）...
  <link rel="alternate" hreflang="x-default" href="https://lingflux.com/zh-cn/..." />
  ```

### 步骤 4 — 修复 H1：根路径重定向（待决策，见第五节）　⏸ 暂缓

### 步骤 5 — 收尾（H2 / H3 / H4）　✅ 已完成
- **H2**：在 Layout 加 locale → `og:locale` 映射（`zh-cn → zh_CN` 等）。
- **H3**：移除 WebSite JSON-LD 的 `potentialAction`（除非后续真做站内搜索）。
- **H4**：移除硬编码 `<meta name="keywords">`，或改为按页面传入。

---

## 五、待决策项（需用户确认）

> **2026-06-18 更新**：用户已决定**暂缓 H1**，保持现状的 meta-refresh 软跳转。以下两个方案留待将来重新评估；若要执行，推荐方案 A（Cloudflare 301）。

**根路径 `/` 的处理方式（H1）**，二选一：

- **方案 A：Cloudflare 边缘 301**（推荐）
  - 在 Cloudflare 配 `/ → /zh-cn/` 的 301 重定向。
  - 优点：对 SEO 最干净；根页面 `index.astro` 可保留为兜底。
  - 代价：需在 Cloudflare 控制台操作（非纯代码）。

- **方案 B：根路径直接渲染默认语言内容**
  - 删除 [index.astro](../src/pages/index.astro) 的跳转逻辑，改为直接渲染 zh-cn 首页，并把 `/` 设为 canonical。
  - 优点：纯代码，无外部依赖。
  - 代价：`/` 与 `/zh-cn/` 内容重复，需用 canonical 收敛（指向其中一个）。

---

## 六、验证检查清单（改完后逐项跑）

- [x] `curl -sI https://lingflux.com/sitemap-index.xml` → 200　（本地构建已生成 `sitemap-index.xml` + `sitemap-0.xml`；线上需部署后确认）
- [x] `curl -sI https://lingflux.com/og-image.png` → 200　（`public/og-image.png` 已生成，1200×630）
- [x] 任意页面 HTML 包含 `hreflang` × 9 + `x-default`　（已验证，`x-default` → `/en/`）
- [x] `og:locale` 值形如 `zh_CN` / `en_US`　（已改为 `en_US` / `zh_CN` 等 + `og:locale:alternate`）
- [x] 首页 JSON-LD 不再含指向 404 的 `potentialAction`　（已移除 `SearchAction`）
- [x] 非中文页不再输出中文 keywords　（已移除全站 `keywords`；另修复非中文页卡片误用中文 locale）
- [ ] 根路径 `/` 行为符合第五节选定方案　（H1 暂缓，见第五节）
- [ ] 提交 sitemap 到 Google Search Console，覆盖率无报错　（待部署后由用户提交）

---

## 七、附：审计使用的命令

```bash
# sitemap / og 图 / 根路径 / search 是否 200
curl -sI https://lingflux.com/sitemap-index.xml | head -1
curl -sI https://lingflux.com/og-image.jpg | head -1
curl -sI https://lingflux.com/ | grep HTTP
curl -sI https://lingflux.com/zh-cn/search | head -1

# 是否存在 hreflang / sitemap 集成
grep -rn "hreflang\|rel=\"alternate\"\|x-default" src/
grep -niE "sitemap|integrations" astro.config.mjs

# 内容规模
for c in experiments articles filaments models printers boards modules solutions; do
  echo "$c: $(find src/content/$c -type f | wc -l)"
done
```

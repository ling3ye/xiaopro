# 添加新语言支持指南

本文档介绍如何为项目添加新的国家/地区语言支持。

## 概述

项目采用多语言架构，每个内容类型（文章、实验、方案等）都支持按语言目录组织。添加新语言需要修改配置文件、添加翻译内容、并更新相关组件。

## 步骤一：添加语言代码和配置

### 1. 更新 Header 组件中的语言列表

**文件**: `src/components/Header.astro`

在 `languages` 数组中添加新语言：

```typescript
const languages = [
  { code: 'zh-cn', name: '简体中文' },
  { code: 'zh-tw', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },  // 新增
];
```

### 2. 更新 i18n 配置文件

**文件**: `src/i18n/config.ts`

#### 2.1 添加语言映射

在 `languages` 对象中添加新语言：

```typescript
export const languages = {
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',  // 新增
} as const;
```

#### 2.2 添加完整的 UI 翻译

在 `ui` 对象中为新语言添加完整的翻译键值对。参考其他语言的完整翻译结构，包括：

- 导航 (`nav.*`)
- 文章 (`articles.*`)
- 实验 (`experiments.*`)
- 方案 (`solutions.*`)
- 开发板 (`board.*`)
- 模块 (`module.*`)
- 页脚 (`footer.*`)
- 通用UI (`ui.*`)

**注意**: 所有现有翻译键都必须添加到新语言中。

### 3. 更新语言排序

**文件**: `src/utils/i18n.ts`

在 `getLanguageSwitcherLinks` 函数的 `langOrder` 数组中添加新语言代码：

```typescript
const langOrder: Lang[] = ['en', 'zh-cn', 'zh-tw', 'ja', 'ko'];
```

## 步骤二：更新内容类型 Schema 定义

**文件**: `src/content/config.ts`

在 `boards` 和 `modules` 的 schema 定义中添加新语言的可选字段：

```typescript
// boards collection
const boards = defineCollection({
  // ...
  specs: z.array(
    z.object({
      'zh-cn': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      'zh-tw': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      'en': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      'ja': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      'ko': z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),  // 新增
    })
  ).optional(),
  tags: z.array(
    z.object({
      'zh-cn': z.array(z.string()).optional(),
      'zh-tw': z.array(z.string()).optional(),
      'en': z.array(z.string()).optional(),
      'ja': z.array(z.string()).optional(),
      'ko': z.array(z.string()).optional(),  // 新增
    })
  ).optional(),
});

// modules collection - 同样需要添加
const modules = defineCollection({
  // ... 同样添加 'ko' 到 specs 和 tags 中
});
```

## 步骤三：为现有内容添加翻译

### 3.1 为开发板添加翻译

**目录**: `src/content/boards/`

为每个开发板的 JSON 文件添加新语言的翻译：

```json
{
  "id": "esp32",
  "name": "ESP32",
  "specs": [
    {
      "zh-cn": { "CPU": "Xtensa 双核 32位...", ... },
      "en": { "CPU": "Xtensa dual-core 32-bit...", ... },
      "ja": { "CPU": "Xtensa デュアルコア...", ... },
      "ko": { "CPU": "Xtensa 듀얼코어...", ... }  // 新增
    }
  ],
  "tags": [
    {
      "zh-cn": ["ESP32", "物联网", ...],
      "en": ["ESP32", "IoT", ...],
      "ja": ["ESP32", "IoT", ...],
      "ko": ["ESP32", "IoT", ...]  // 新增
    }
  ]
}
```

### 3.2 为模块添加翻译

**目录**: `src/content/modules/`

为每个模块的 JSON 文件添加新语言的翻译，格式与开发板相同。

## 步骤四：创建内容目录结构

### 4.1 创建文章目录

```bash
mkdir -p src/content/articles/{lang}
```

将需要翻译的文章复制到新目录并翻译。

### 4.2 创建实验目录

```bash
mkdir -p src/content/experiments/{board}/{lang}
```

将需要翻译的实验复制到新目录并翻译。

### 4.3 方案目录

方案采用 `[lang]` 路径参数，需要在 `src/pages/[lang]/solutions/` 目录下创建对应的 `.md` 文件。

## 步骤五：验证页面多语言支持

检查并更新页面组件，确保使用 i18n 翻译而非硬编码文本。

**检查文件**: `src/pages/[lang]/**/*.astro`

确保所有显示文本都通过 `t()` 函数获取翻译：

```astro
<!-- 错误 - 硬编码文本 -->
<h1>方案列表</h1>

<!-- 正确 - 使用翻译 -->
<h1>{t('solutions.listTitle')}</h1>
```

## 步骤六：测试

1. 访问 `/{lang}/` 路径，确认首页正常显示
2. 切换语言，确认语言切换器正常工作
3. 检查各个页面（boards、modules、experiments、solutions、articles）
4. 验证 SEO 元数据（title、description）正确翻译

## 语言代码规范

使用标准 ISO 639-1 语言代码：

| 代码 | 语言 | 示例目录 |
|------|------|----------|
| zh-cn | 简体中文 | `src/content/articles/zh-cn/` |
| zh-tw | 繁体中文 | `src/content/articles/zh-tw/` |
| en | English | `src/content/articles/en/` |
| ja | 日本語 | `src/content/articles/ja/` |
| ko | 한국어 | `src/content/articles/ko/` |

## 注意事项

1. **翻译一致性**: 确保技术术语在各语言间保持一致的翻译风格
2. **完整翻译**: 所有 UI 元素必须翻译，避免回退到默认语言
3. **URL 友好**: 文件名使用 URL 友好的字符（推荐使用小写字母、连字符）
4. **SEO 优化**: 每个页面都应包含正确的 `lang` 属性和翻译后的 meta 信息
5. **渐进添加**: 可以先添加基础翻译，后续逐步完善内容

## 参考

- [i18n 配置文件](../src/i18n/config.ts)
- [内容类型定义](../src/content/config.ts)
- [韩语添加示例提交](https://github.com/.../commit/db2ccd4)

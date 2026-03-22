# 多语言文章处理工作流

## 任务描述
完成以下两个任务：
1. **添加 frontmatter** - 为原始文章添加 YAML frontmatter 参数
2. **多语言翻译** - 为文章添加繁体中文、英文、韩文、日文版本

## 任务 1：添加 frontmatter

### Frontmatter 参数说明

在原始简体中文文章（zh-cn）最开头添加 YAML frontmatter，用 `---` 包围：

| 参数 | 类型 | 说明 |
|------|------|------|
| title | string | 文章标题，可加副标题用 `｜` 分隔 |
| domain | string | 领域分类：ai / dev / design / product / ops 等 |
| platforms | array | 适用平台，如 ["mac"]、["mac", "windows", "linux"] |
| format | string | 文章格式：tutorial / guide / news / review / opinion |
| date | string | 发布日期，格式 YYYY-MM-DD |
| intro | string | 1-2 句话介绍文章内容和目标读者 |
| image | string | 封面图 URL，若无可用格式：`https://img.lingflux.com/2026/03/[英文标题连字符].webp` |
| tags | array | 5-8 个标签，包含中英文关键词 |

### Frontmatter 示例

```yaml
---
title: "标题｜副标题"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "适合 Mac 用户、AI 新手，以及想尝试 TTS 模型的开发者。"
image: "https://img.lingflux.com/2026/03/qwen3-tts-guide.webp"
tags: ["qwen3 tts", "qwen tts mac", "Qwen3-TTS Mac 配置", "Qwen 文字转语音"]
---
```

---

## 任务 2：多语言翻译要求

### 通用原则
1. **先阅读理解全文** - 不要逐句翻译，先完整理解文章内容、语气和上下文
2. **自然流畅** - 避免生硬直译，使用各语种日常生活中的自然表达方式
3. **保持技术准确性** - 专业术语保持一致，代码块、命令、配置项等不变
4. **保留 frontmatter** - 翻译 frontmatter 中的 title、intro、tags 字段

### 各语言注意事项

#### 繁体中文（zh-tw）
- 使用台湾地区常用术语：程式員（程序员）、本機（本地）、精靈（向导）、資料夾（文件夹）、網路（网络）、設定（配置）、軟體（软件）、硬體（硬件）
- 语气保持轻松友好，适当使用口语化表达
- 引号使用直角引號 「」

#### 英文（en）
- 保持技术博客的专业性，但语气自然流畅
- 避免过度直译中文表达习惯（如"死马当活马医"改为"nothing to lose"等英文惯用语）
- 标题和章节标题保持简洁有力
- 适当使用英文技术社区常用表达

#### 日文（ja）
- 使用日本技术社区常用的表达方式
- 遇到中国成语/俗语时用对应的日语惯用语或意译（如"踩坑"→"ハマる"、"折腾"→"格闘する"）
- 使用日文标点（句号「。」、逗号「、」）
- 语气亲切自然，适合技术博客风格
- 专业术语可以保留英文原文（如"config"、"API token"等）

## 操作步骤

### 任务 1：添加 Frontmatter
1. **阅读原文** - 使用 Read 工具读取简体中文原文
2. **理解内容** - 理解文章主题、技术点、目标读者、语气风格
3. **添加 frontmatter** - 根据文章内容智能推断各参数值，在文章开头添加 frontmatter
4. **保存文件** - 使用 Edit 工具更新原始文件

### 任务 2：多语言翻译
5. **生成 SEO 友好文件名** - 基于文章英文标题生成 kebab-case 格式文件名（空格用 `-` 代替）
6. **重命名原文件** - 使用 Bash 工具将 `zh-cn` 原文件重命名为新文件名
7. **创建翻译文件** - 分别在 `src/content/articles/zh-tw/`、`src/content/articles/en/`、`src/content/articles/ja/` 目录下创建同名文件
8. **执行翻译** - 按各语言特点进行自然流畅的翻译
9. **验证格式** - 确保所有版本的 frontmatter 格式正确、代码块无误

---

## 输出示例

### 原始文件（zh-cn）Frontmatter 格式

```yaml
---
title: "本地跑 Qwen3-TTS 启动 Web UI 完全手册｜不会代码也能玩声音克隆"
domain: ai
platforms: ["mac", "windows"]
format: "tutorial"
date: 2026-03-19
intro: "Qwen3-TTS 自带网页界面，上传录音就能克隆声音，完全不需要写代码。本文支持 Mac（M 系列芯片）、Windows（NVIDIA 显卡）配置。"
image: "https://img.lingflux.com/2026/03/qwen3-tts-web-ui-guide.webp"
tags: ["qwen3 tts", "qwen tts web ui", "qwen voice clone", "Qwen3-TTS Web 界面", "Qwen 声音克隆", "Qwen TTS 教程"]
---
```

```markdown
---
title: "[翻译后的标题]"
domain: "[原文内容]"
platforms: "[原文内容]"
format: "[原文内容]"
date: 2026-03-12
intro: "[翻译后的简介]"
image: "[保持原图片链接]"
tags: ["翻译后的标签"]
---

[正文翻译内容]
```

## 注意事项

- 代码块中的bash命令、错误信息等保持原样不翻译
- 链接URL保持不变
- 日期格式保持YYYY-MM-DD格式
- emoji符号可以保留（如🦞）
- **文件命名规则**：使用kebab-case格式，空格用连字符(-)代替，建议基于英文标题生成符合SEO的文件名，包含核心关键词（如产品名、平台、操作类型等）

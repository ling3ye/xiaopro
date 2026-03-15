# TODO

## 多语言配置分散问题

### 问题描述

当前多语言配置分散在多个位置，导致维护时需要多处同步修改，容易出错。

### 当前配置位置

1. **`src/i18n/config.ts`**
   - 定义 `languages` 对象（语言代码与显示名称映射）
   - 定义 `defaultLang`（默认语言）
   - 定义 `ui` 翻译字典

2. **`src/components/Header.astro`**
   - 第 25 行：`const { lang = 'en', currentPath = '/' } = Astro.props;`
   - 第 41-46 行：硬编码的 `languages` 数组
   ```typescript
   const languages = [
     { code: 'en', name: 'English' },
     { code: 'zh-cn', name: '简体中文' },
     { code: 'zh-tw', name: '繁體中文' },
     { code: 'ja', name: '日本語' },
   ];
   ```

3. **`src/utils/i18n.ts`**
   - 定义了 `getLanguageSwitcherLinks()` 函数，但 Header.astro 并未使用
   - 该函数内部也有硬编码的语言顺序

### 存在的问题

- 语言配置重复（Header.astro 中的 `languages` 数组与 config.ts 中的 `languages` 对象）
- 语言排序重复定义（i18n.ts 和 Header.astro 各定义一次）
- 修改语言配置需要同步多个地方
- `getLanguageSwitcherLinks()` 函数定义了但未被使用

### 建议的解决方案

1. 统一使用 `src/i18n/config.ts` 作为唯一配置源
2. 在 `src/i18n/config.ts` 中添加语言顺序配置
3. Header.astro 改用 `getLanguageSwitcherLinks()` 或从 config 统一导入
4. 考虑添加语言检测和重定向功能（基于 `navigator.language`）

### 参考代码

```typescript
// src/i18n/config.ts 建议添加
export const langOrder: SupportedLocale[] = ['en', 'zh-cn', 'zh-tw', 'ja'];

// src/components/Header.astro 建议改为
import { languages, langOrder, defaultLang } from '../i18n/config';
const { lang = defaultLang, currentPath = '/' } = Astro.props;
```

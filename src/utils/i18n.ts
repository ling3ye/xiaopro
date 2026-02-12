// src/utils/i18n.ts
import { ui, defaultLang, languages } from '../i18n/config';

export type Lang = keyof typeof languages;
export type UIKey = keyof typeof ui[typeof defaultLang];

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in languages) {
    return lang as Lang;
  }
  return defaultLang as Lang;
}

export function useTranslations(lang: Lang | undefined | string) {
  return function t(key: UIKey): string {
    // 1. 安全检查：确认 lang 是否有效且存在于我们的配置中
    // 如果 lang 是 undefined，或者是一个我们在 config 里没定义的语言，就强制用默认语言
    const effectiveLang = (lang && lang in ui) ? (lang as Lang) : defaultLang;
    
    // 2. 获取对应的字典
    const dict = ui[effectiveLang];
    
    // 3. 再次检查字典是否存在（双重保险）
    if (!dict) {
      console.warn(`Translation dictionary missing for language: ${effectiveLang}`);
      return String(key);
    }

    // 4. 返回翻译结果，如果找不到特定 key，回退到默认语言的 key
    return dict[key] || ui[defaultLang][key] || String(key);
  }
}

// ... 保持 getLocalizedPath 和 getLanguageSwitcherLinks 不变 ...
export function getLocalizedPath(path: string, lang: Lang | string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${cleanPath}`;
}

export function getLanguageSwitcherLinks(currentUrl: URL) {
  const currentLang = getLangFromUrl(currentUrl);
  const currentPath = currentUrl.pathname.replace(`/${currentLang}`, '');
  
  return Object.keys(languages).map((langCode) => {
    const code = langCode as Lang;
    return {
      lang: code,
      label: languages[code],
      href: `/${code}${currentPath || ''}`,
      isActive: code === currentLang
    };
  });
}
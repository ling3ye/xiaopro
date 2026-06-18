// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 将此处替换为你自己的购买的域名，注意要带上 https://
  site: 'https://lingflux.com/',

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

/**
 * 文章内广告注入（方案 A · 客户端 DOM 注入）
 * ------------------------------------------------------------------
 * 目标：不改动任何 .md 文档，在文章正文的第 3 / 第 6 个 H2 之前插入
 *      Google AdSense in-article 广告单元。
 *
 * 作用范围（由页面标记控制，本文件不硬编码页面）：
 *   只有带 `data-in-article-ads` 属性的 .prose 容器会被处理。
 *   当前已打标记的位置：
 *     - src/pages/[lang]/experiments/[...path].astro  （实验详情页）
 *     - src/components/ArticleDetail.astro             （文章详情页，5 个 domain 共用）
 *
 * 如何切换路线（方案 A → 方案 B · 构建期 rehype 注入）：
 *   1) 删除本文件，以及 Layout.astro 底部对本文件的 <script> 引用；
 *   2) 在 astro.config.mjs 的 markdown 配置里新增 rehype 插件，
 *      沿用下方 IN_ARTICLE_AD_CONFIG 的 ads（位置 + slot）/ client 语义；
 *   3) 页面上的 data-in-article-ads 标记可保留，供 rehype 端按该标记 gate。
 *
 * @module in-article-ads
 */

/* ==================== CONFIG（改广告参数只需动这里） ==================== */
const IN_ARTICLE_AD_CONFIG = {
  /** 广告位列表：每个位置（第 N 个 H2 之前，1-based）配一个独立广告单元 slot。
   *  例：position:3 → 插在第 2 个 H2 的正文与第 3 个 H2 标题之间。
   *  想加/减广告，直接增删本数组项；两处位置用不同 slot，便于在 AdSense 后台分开统计效果。 */
  ads: [
    { position: 3, slot: '6671033283' },  // 第 3 个 H2 上方
  ],
  /** AdSense 参数（与 Layout.astro <head> 中全局加载的 script 对应） */
  client: 'ca-pub-5370940476348866',
  format: 'fluid',       // in-article 流式
  layout: 'in-article',
  /** 预留最小高度（px）：降低广告填充前后的 CLS 布局跳动（fluid 高度不定，此为经验值，可按需调） */
  minHeight: 250,
  /** 广告上方的小标签（可置 visible:false 关闭） */
  label: { visible: true, text: 'ADVERTISEMENT' },
};

/* ==================== 注入逻辑（一般无需改动） ==================== */
(function () {
  'use strict';

  // 防重复执行（热更新 / 重复引用等场景兜底）
  if (window.__IN_ARTICLE_ADS_DONE__) return;
  window.__IN_ARTICLE_ADS_DONE__ = true;

  var config = IN_ARTICLE_AD_CONFIG;

  function buildAdUnit(slot) {
    var wrap = document.createElement('div');
    wrap.className = 'in-article-ad';
    wrap.style.minHeight = config.minHeight + 'px';
    wrap.style.margin = '2rem 0';
    wrap.style.textAlign = 'center';

    if (config.label.visible) {
      var label = document.createElement('span');
      label.className = 'in-article-ad__label';
      label.textContent = config.label.text;
      // 用 opacity + 继承文字色，自动适配 Paper / Ocean 双主题
      label.style.display = 'block';
      label.style.fontSize = '11px';
      label.style.letterSpacing = '0.12em';
      label.style.textTransform = 'uppercase';
      label.style.opacity = '0.55';
      label.style.marginBottom = '0.5rem';
      wrap.appendChild(label);
    }

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-layout', config.layout);
    ins.setAttribute('data-ad-format', config.format);
    ins.setAttribute('data-ad-client', config.client);
    ins.setAttribute('data-ad-slot', slot);
    wrap.appendChild(ins);

    return wrap;
  }

  // 只处理被页面显式标记过的正文容器
  var hosts = document.querySelectorAll('.prose[data-in-article-ads]');
  var inserted = 0;

  hosts.forEach(function (host) {
    var h2s = Array.prototype.slice.call(host.querySelectorAll('h2'));

    config.ads.forEach(function (ad) {
      // 第 N 个 H2 → 数组下标 N-1；H2 数量不足的位置自然跳过
      var heading = h2s[ad.position - 1];
      if (!heading) return;
      heading.parentNode.insertBefore(buildAdUnit(ad.slot), heading);
      inserted++;
    });
  });

  // 所有 <ins> 落位后统一触发一次扫描填充（AdSense 官方动态加载方式）
  if (inserted > 0) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
})();

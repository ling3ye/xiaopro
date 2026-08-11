/* LINGFLUX · Theme 1 "Ocean Deep" — 交互脚本 */
(function () {
  'use strict';

  /* ---------- 移动端抽屉导航 ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var backdrop = document.querySelector('.nav-backdrop');
  var drawerClose = document.querySelector('.nav-drawer-close');

  function closeNav() { document.body.classList.remove('nav-open'); }
  if (toggle) {
    toggle.addEventListener('click', function () { document.body.classList.add('nav-open'); });
  }
  if (backdrop) backdrop.addEventListener('click', closeNav);
  if (drawerClose) drawerClose.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ---------- 滚动显现动画 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 数字滚动统计 ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        countIO.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10);
        var dur = 1400;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.firstChild.nodeValue = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* ---------- 代码高亮（CDN 失败时静默降级） ---------- */
  if (window.hljs) {
    try { window.hljs.highlightAll(); } catch (e) { /* noop */ }
  }

  /* ---------- 代码一键复制 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  document.querySelectorAll('.code-block').forEach(function (block) {
    var btn = block.querySelector('.copy-btn');
    var code = block.querySelector('pre code');
    if (!btn || !code) return;
    var label = btn.querySelector('span');
    var original = label ? label.textContent : '复制';
    btn.addEventListener('click', function () {
      copyText(code.innerText).then(function () {
        btn.classList.add('copied');
        if (label) label.textContent = '已复制';
        setTimeout(function () {
          btn.classList.remove('copied');
          if (label) label.textContent = original;
        }, 1800);
      }).catch(function () {
        if (label) label.textContent = '复制失败';
        setTimeout(function () { if (label) label.textContent = original; }, 1800);
      });
    });
  });

  /* ---------- 阅读进度条 + 回到顶部 ---------- */
  var progress = document.querySelector('.progress-bar');
  var toTop = document.querySelector('.to-top');
  var article = document.querySelector('.article-body');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (progress) {
      var base = article ? article.offsetTop : 0;
      var total = article ? article.offsetHeight - window.innerHeight + base
                          : document.documentElement.scrollHeight - window.innerHeight;
      var pct = total > 0 ? Math.min(Math.max((y - base + window.innerHeight * 0.35) / total, 0), 1) * 100 : 0;
      progress.style.width = pct + '%';
    }
    if (toTop) toTop.classList.toggle('show', y > 600);
  }
  if (progress || toTop) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- TOC Scrollspy ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = document.getElementById(id);
      if (el) map[id] = a;
    });
    var visible = {};
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible[en.target.id] = en.isIntersecting;
      });
      var ids = Object.keys(map);
      var active = null;
      for (var i = 0; i < ids.length; i++) {
        if (visible[ids[i]]) { active = ids[i]; break; }
      }
      if (!active) {
        // 没有可见标题时，选最近滚过的那个
        var y = window.scrollY + 120;
        for (var j = ids.length - 1; j >= 0; j--) {
          var el = document.getElementById(ids[j]);
          if (el && el.offsetTop <= y) { active = ids[j]; break; }
        }
      }
      tocLinks.forEach(function (a) { a.classList.remove('on'); });
      if (active && map[active]) map[active].classList.add('on');
    }, { rootMargin: '-90px 0px -55% 0px', threshold: 0 });

    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spyIO.observe(el);
    });
  }

  /* ---------- 模块筛选 ---------- */
  var filterBar = document.querySelector('.filter-bar[data-filter]');
  if (filterBar) {
    var chips = filterBar.querySelectorAll('.filter-chip');
    var items = document.querySelectorAll('[data-cat]');
    var empty = document.querySelector('.filter-empty');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var cat = chip.getAttribute('data-value');
        var shown = 0;
        items.forEach(function (item) {
          var hit = cat === 'all' || item.getAttribute('data-cat') === cat;
          item.style.display = hit ? '' : 'none';
          if (hit) shown++;
        });
        if (empty) empty.style.display = shown ? 'none' : '';
      });
    });
  }
})();

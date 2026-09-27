// 各小节页面（sections/*.html）共用脚本：
// Tailwind 配置、公共样式接收、代码高亮、复制按钮、Lucide 图标、iframe 高度同步
(function () {
  'use strict';

  // Tailwind 配置（与 index.html 中的配置保持一致）
  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        },
      },
    },
  };

  // 公共样式：由父页面 index.html 在 iframe load 后通过 postMessage 注入，
  // 追加为 text/tailwindcss 样式块后由本页的 Play CDN 编译生效
  var commonApplied = false;
  function applyCommonStyle(css) {
    if (commonApplied || !css) return;
    commonApplied = true;
    var style = document.createElement('style');
    style.type = 'text/tailwindcss';
    style.textContent = css;
    document.head.appendChild(style);
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.type === 'common-style') applyCommonStyle(d.css);
  });
  // 兜底：直接通过 http(s) 打开某个小节页时，从 index.html 抓取公共样式
  if (window.parent === window && /^https?:$/.test(location.protocol)) {
    fetch('../index.html')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var m = text.match(/<style type="text\/tailwindcss" data-common>([\s\S]*?)<\/style>/);
        if (m) applyCommonStyle(m[1]);
      })
      .catch(function () {});
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
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
      } catch (e) {
        reject(e);
      } finally {
        ta.remove();
      }
    });
  }

  document.querySelectorAll('.code-card').forEach(function (card) {
    var btn = card.querySelector('.code-copy');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var code = card.querySelector('code');
      if (!code) return;
      copyText(code.innerText).then(function () {
        btn.innerHTML = '已复制 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = '复制';
          btn.classList.remove('copied');
        }, 1600);
      }).catch(function () {});
    });
  });

  if (window.hljs) hljs.highlightAll();
  if (window.lucide) lucide.createIcons();

  // 高度同步：ResizeObserver 覆盖 Tailwind 编译完成、公共样式注入、字体加载、宽度变化等所有尺寸变化
  function postHeight() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'section-height', height: Math.ceil(h) }, '*');
  }
  if (window.ResizeObserver) {
    new ResizeObserver(postHeight).observe(document.body);
  }
  window.addEventListener('load', postHeight);
  postHeight();
})();

// 各小节页面（sections/*.html）共用脚本：代码高亮、复制按钮、Lucide 图标、iframe 高度同步
(function () {
  'use strict';

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

  // 高度同步：ResizeObserver 覆盖 Tailwind 编译完成、字体加载、宽度变化引起的所有尺寸变化
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

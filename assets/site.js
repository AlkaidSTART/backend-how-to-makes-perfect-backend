// 页面脚本：复制按钮、阅读进度、目录高亮、本节内容与移动端导航（代码高亮与图标已在构建期完成）
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

  var CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  // 复制结果通过 aria-live 播报给读屏器；失败时给出可见提示，而不是静默吞掉
  var live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  document.querySelectorAll('.code-card').forEach(function (card) {
    var btn = card.querySelector('.code-copy');
    if (!btn) return;
    var timer = null;
    function flash(cls, html, msg) {
      clearTimeout(timer);
      btn.classList.remove('copied', 'failed');
      btn.classList.add(cls);
      btn.innerHTML = html;
      live.textContent = msg;
      timer = setTimeout(function () {
        btn.textContent = '复制';
        btn.classList.remove(cls);
        live.textContent = '';
      }, cls === 'failed' ? 2400 : 1600);
    }
    btn.addEventListener('click', function () {
      var code = card.querySelector('code');
      if (!code) return;
      copyText(code.innerText).then(function () {
        flash('copied', '已复制 ' + CHECK_SVG, '代码已复制到剪贴板');
      }).catch(function () {
        flash('failed', '复制失败，请手动选择', '复制失败，请手动选择代码');
      });
    });
  });

  // 阅读进度 + 目录高亮 + 返回顶部 + 移动端当前小节条
  var progress = document.getElementById('progress');
  var backTop = document.getElementById('back-top');
  var tocNav = document.getElementById('toc');
  var heroEl = document.querySelector('body > header');
  var nowBar = document.getElementById('now-bar');
  var nowBtn = document.getElementById('now-btn');
  var nowNum = document.getElementById('now-num');
  var nowTitle = document.getElementById('now-title');
  var nowPanel = document.getElementById('now-panel');
  var mobileWrap = document.getElementById('toc-mobile-wrap');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('#toc a[href^="#"]'));

  // 目录编号按出现顺序自动生成，与小节页的 01–33 编号一致
  tocLinks.forEach(function (a, i) {
    var num = document.createElement('span');
    num.className = 'toc-num';
    num.textContent = (i < 9 ? '0' : '') + (i + 1);
    a.insertBefore(num, a.firstChild);
  });

  // 移动端目录与当前小节条的目录面板都由桌面端 #toc 克隆生成，目录只维护一份
  function buildMobileToc(container) {
    var list = null;
    Array.prototype.forEach.call(tocNav.children, function (node) {
      if (node.classList.contains('toc-group')) {
        var g = document.createElement('p');
        g.className = 'tocm-group';
        g.textContent = node.textContent;
        container.appendChild(g);
        list = document.createElement('div');
        list.className = 'tocm-links';
        container.appendChild(list);
      } else if (node.tagName === 'A' && list) {
        list.appendChild(node.cloneNode(true));
      }
    });
  }
  buildMobileToc(document.getElementById('toc-mobile'));
  buildMobileToc(nowPanel);
  var allLinks = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));

  // 本节内容：按当前小节的 h3 生成，宽屏放右侧栏，移动端放在当前小节条面板顶部
  var outlineNav = document.getElementById('outline');
  var outlineList = document.getElementById('outline-list');
  var nowOutline = document.createElement('div');
  nowOutline.id = 'now-outline';
  nowOutline.hidden = true;
  nowPanel.insertBefore(nowOutline, nowPanel.firstChild);
  var outlineHeads = [], outlineLinks = [], lastHead = null;

  function renderOutline(section) {
    var heads = section ? Array.prototype.slice.call(section.querySelectorAll('h3.doc-h3[id]')) : [];
    outlineHeads = heads.length >= 2 ? heads : [];
    outlineLinks = [];
    lastHead = null;
    outlineList.textContent = '';
    nowOutline.textContent = '';
    outlineNav.hidden = nowOutline.hidden = !outlineHeads.length;
    if (!outlineHeads.length) return;
    var label = document.createElement('p');
    label.className = 'tocm-group';
    label.textContent = '本节内容';
    nowOutline.appendChild(label);
    outlineHeads.forEach(function (h) {
      [outlineList, nowOutline].forEach(function (box) {
        var a = document.createElement('a');
        a.className = 'outline-link';
        a.href = '#' + h.id;
        a.textContent = h.textContent.trim();
        box.appendChild(a);
        outlineLinks.push(a);
      });
    });
  }

  function setPanel(open) {
    nowPanel.hidden = !open;
    nowBtn.setAttribute('aria-expanded', String(open));
  }
  nowBtn.addEventListener('click', function () { setPanel(nowPanel.hidden); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !nowPanel.hidden) { setPanel(false); nowBtn.focus(); }
  });
  // 点击移动端目录项后收起，避免跳转后仍留着一大块展开的列表
  document.getElementById('toc-mobile').addEventListener('click', function (e) {
    if (e.target.closest('a')) mobileWrap.open = false;
  });
  nowPanel.addEventListener('click', function (e) {
    if (e.target.closest('a')) setPanel(false);
  });

  var targets = tocLinks
    .map(function (a, i) {
      return { a: a, href: a.getAttribute('href'), num: a.querySelector('.toc-num').textContent,
               title: a.textContent.slice(a.querySelector('.toc-num').textContent.length),
               el: document.getElementById(a.getAttribute('href').slice(1)) };
    })
    .filter(function (t) { return t.el; });

  // 当前项超出桌面目录可视区时，只滚动目录自身（不影响页面滚动）
  function keepTocVisible(a) {
    var top = a.offsetTop, bottom = top + a.offsetHeight, pad = 48;
    if (top - pad < tocNav.scrollTop) tocNav.scrollTop = top - pad;
    else if (bottom + pad > tocNav.scrollTop + tocNav.clientHeight) tocNav.scrollTop = bottom + pad - tocNav.clientHeight;
  }

  var ticking = false, lastHref = null;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      progress.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
      backTop.classList.toggle('show', doc.scrollTop > 480);

      var y = window.scrollY + 150;
      var current = null;
      for (var i = 0; i < targets.length; i++) {
        // 字体加载等仍会改变布局，offsetTop 每次实时读取
        if (targets[i].el.offsetTop <= y) current = targets[i];
      }

      var pastHero = heroEl.getBoundingClientRect().bottom < 0 && !!current;
      nowBar.classList.toggle('show', pastHero);
      if (!pastHero && !nowPanel.hidden) setPanel(false);

      var href = current ? current.href : null;
      if (href !== lastHref) {
        lastHref = href;
        allLinks.forEach(function (a) {
          var on = a.getAttribute('href') === href;
          a.classList.toggle('toc-active', on);
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
        if (current) {
          nowNum.textContent = current.num;
          nowTitle.textContent = current.title;
          if (tocNav.offsetParent) keepTocVisible(current.a);
        }
        renderOutline(current && current.el);
      }

      // 本节内容高亮：最后一个越过阅读线的小标题
      var head = null;
      for (var j = 0; j < outlineHeads.length; j++) {
        if (outlineHeads[j].getBoundingClientRect().top <= 150) head = outlineHeads[j];
      }
      if (head !== lastHead) {
        lastHead = head;
        var target = head ? '#' + head.id : null;
        outlineLinks.forEach(function (a) { a.classList.toggle('outline-active', a.getAttribute('href') === target); });
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();

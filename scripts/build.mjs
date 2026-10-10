// 构建：把 sections/*.html 片段拼入 index.html，并根据小节生成桌面端目录，最后用 Tailwind CLI 编译 assets/site.css
//   npm run build          重新生成 index.html 与 assets/site.css
//   npm run check          只校验 index.html 是否与 sections/ 同步（不写文件，不同步时退出码为 1）
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import hljs from 'highlight.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

// 图标构建期内联：<i data-lucide="name" class="..."></i> → lucide-static 的 SVG，
// 页面无需运行时图标库，也不会因图标替换产生布局跳动
const iconCache = new Map();
function iconSvg(name) {
  if (!iconCache.has(name)) {
    let svg;
    try {
      svg = readFileSync(join(root, 'node_modules', 'lucide-static', 'icons', `${name}.svg`), 'utf8');
    } catch {
      throw new Error(`未知的 Lucide 图标：${name}`);
    }
    iconCache.set(name, svg.replace(/<!--[\s\S]*?-->/g, '').trim().replace(/\s*\n\s*/g, ' ').replace(/ >/g, '>'));
  }
  return iconCache.get(name);
}
function inlineIcons(html) {
  return html.replace(/<i data-lucide="([a-z0-9-]+)"([^>]*)><\/i>/g, (_, name, rest) => {
    const attrs = Object.fromEntries([...rest.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const extraClass = attrs.class ? ' ' + attrs.class : '';
    delete attrs.class;
    attrs['aria-hidden'] ??= 'true';
    const extra = Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
    return iconSvg(name).replace(/class="([^"]*)"/, `class="$1${extraClass}"${extra}`);
  });
}

// 代码高亮构建期完成：输出与 hljs.highlightAll() 相同的标记，页面无需运行时高亮库
const unescapeHtml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function highlightCode(html) {
  // 未标语言的代码块（如目录树）不着色，但要套上 .hljs 基础色，否则会继承深色正文色、在深色卡片上看不见
  html = html.replace(/<pre class="code-body"><code>/g, '<pre class="code-body"><code class="hljs">');
  return html.replace(/<code class="language-([a-z]+)">([\s\S]*?)<\/code>/g, (_, lang, code) => {
    if (!hljs.getLanguage(lang)) throw new Error(`highlight.js 不支持的语言：${lang}`);
    const { value } = hljs.highlight(unescapeHtml(code), { language: lang, ignoreIllegals: true });
    return `<code class="language-${lang} hljs">${value}</code>`;
  });
}

// data-toc 与 sec-title 都已是 HTML 文本，原样写入目录，不再转义
// 读取小节片段：文件名以两位编号开头，按编号排序
const files = readdirSync(join(root, 'sections')).filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
const sections = files.map((file, i) => {
  const html = readFileSync(join(root, 'sections', file), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  const tag = html.match(/<section id="([^"]+)" class="doc-section"(?: data-toc="([^"]*)")?>/);
  const num = html.match(/class="sec-num">(\d+)</);
  const group = html.match(/class="eyebrow">([^<]+)</);
  const title = html.match(/class="sec-title">([^<]+)</);
  if (!tag || !num || !group || !title) throw new Error(`${file}: 缺少 <section id class="doc-section"> / sec-num / eyebrow / sec-title`);
  const expected = String(i + 1).padStart(2, '0');
  if (num[1] !== expected || !file.startsWith(expected)) throw new Error(`${file}: 编号应为 ${expected}，实际 sec-num 为 ${num[1]}`);
  return { file, html, id: tag[1], group: group[1], label: tag[2] || title[1] };
});

const ids = new Set();
for (const s of sections) {
  if (ids.has(s.id)) throw new Error(`重复的小节 id：${s.id}`);
  ids.add(s.id);
}

// 桌面端目录：eyebrow 相同的连续小节归为一组；移动端目录由 site.js 运行时从这里克隆
const toc = [];
let lastGroup = null;
for (const s of sections) {
  if (s.group !== lastGroup) {
    if (lastGroup !== null) toc.push('');
    toc.push(`          <p class="toc-group">${s.group}</p>`);
    lastGroup = s.group;
  }
  toc.push(`          <a class="toc-link" href="#${s.id}">${s.label}</a>`);
}

function fill(src, name, body, indent) {
  const re = new RegExp(`(<!-- build:${name}[^>]*-->)[\\s\\S]*?(\\n${indent}<!-- /build:${name} -->)`);
  if (!re.test(src)) throw new Error(`index.html 缺少 build:${name} 标记`);
  return src.replace(re, (_, open, close) => open + '\n' + body + close);
}

const indexPath = join(root, 'index.html');
const before = readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
let out = fill(before, 'toc', toc.join('\n'), '          ');
out = fill(out, 'sections', highlightCode(sections.map((s) => s.html).join('\n\n')), '        ');
// 模板中的图标转换后会留在 index.html 里，再次构建时已无 <i data-lucide>，结果不变
out = inlineIcons(out);

if (checkOnly) {
  if (out !== before) {
    console.error('index.html 与 sections/ 不同步，请运行 npm run build');
    process.exit(1);
  }
  console.log(`index.html 已同步（${sections.length} 个小节）`);
  process.exit(0);
}

writeFileSync(indexPath, out);
console.log(`index.html：拼入 ${sections.length} 个小节，目录 ${new Set(sections.map((s) => s.group)).size} 组`);

// Tailwind CLI 需在 index.html 写好之后运行，它会扫描拼好的页面来裁剪样式
const bin = join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
execFileSync(process.execPath, [bin, '-c', 'tailwind.config.cjs', '-i', 'src/styles.css', '-o', 'assets/site.css', '--minify'], { cwd: root, stdio: 'inherit' });

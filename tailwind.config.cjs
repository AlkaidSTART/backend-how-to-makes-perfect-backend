/** @type {import('tailwindcss').Config} */
module.exports = {
  // 小节已由 scripts/build.mjs 拼入 index.html；site.js 里动态切换的类名（toc-active、copied 等）也要扫描
  content: ['index.html', 'assets/site.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
};

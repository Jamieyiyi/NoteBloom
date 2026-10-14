import type { RenderedMarkdown, TocEntry } from './renderMarkdown'
import { EXPORT_STYLE, type ExportThemeId } from './themes'
import { bloomSvg } from '../ui/bloom'

/**
 * 完整的獨立 HTML 文件：匯出下載和編輯器右側預覽共用同一份，預覽才會和匯出結果一致。
 * `interactive` 只有匯出時才開：加上目錄、明暗切換的小花和 script（預覽不顯示目錄，iframe 也不執行 script）。
 */
export function buildHtmlDocument(
  title: string,
  rendered: RenderedMarkdown,
  themeId: ExportThemeId,
  interactive: boolean,
): string {
  return `<!doctype html>
<html lang="zh-Hant" data-theme="${themeId}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" type="image/svg+xml" href="${FAVICON}" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Noto+Sans+TC:wght@400;500;700;900&family=Roboto:wght@400;500;700;900&display=swap" />
<style>
${EXPORT_STYLE}
</style>
</head>
<body>
${interactive ? THEME_TOGGLE : ''}
${buildBodyHtml(rendered, interactive)}
${interactive ? `<script>\n${SCRIPT}\n</script>` : ''}
</body>
</html>
`
}

/** showToc：目錄只放在匯出的檔案裡，編輯器的預覽不顯示 */
export function buildBodyHtml(rendered: RenderedMarkdown, showToc: boolean): string {
  const hasToc = showToc && rendered.toc.length > 0
  return `<div class="nb-page${hasToc ? '' : ' no-toc'}">
${hasToc ? buildTocHtml(rendered.toc) : ''}
<main class="nb-content">
${rendered.html}
</main>
</div>`
}

function buildTocHtml(toc: TocEntry[]): string {
  const items = toc
    .map(
      (entry) =>
        `<li class="toc-level-${entry.level}"><a class="toc-link" href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`,
    )
    .join('\n')
  return `<nav class="toc">
<div class="toc-title">目錄</div>
<ol class="toc-list">
${items}
</ol>
</nav>`
}

function escapeHtml(text: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => entities[char])
}

// Same five-petal flower as the app favicon, inlined so the exported file stays self-contained
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='%23f08ba5'%3E%3Ccircle cx='12' cy='6.5' r='4.6'/%3E%3Ccircle cx='17.23' cy='10.3' r='4.6'/%3E%3Ccircle cx='15.23' cy='16.45' r='4.6'/%3E%3Ccircle cx='8.77' cy='16.45' r='4.6'/%3E%3Ccircle cx='6.77' cy='10.3' r='4.6'/%3E%3C/g%3E%3Cellipse cx='6.2' cy='9.3' rx='1.1' ry='0.7' fill='%23fff' opacity='0.55' transform='rotate(-35 6.2 9.3)'/%3E%3Ccircle cx='12' cy='12' r='3.1' fill='%23fff5f8'/%3E%3C/svg%3E"

const THEME_TOGGLE =`<button class="nb-theme-toggle" type="button" title="切換明亮 / 暗黑模式" aria-label="切換明亮 / 暗黑模式">${bloomSvg()}</button>`

const SCRIPT = `
(function () {
  var root = document.documentElement;

  // 太陽 / 月亮切換
  document.querySelector('.nb-theme-toggle').addEventListener('click', function () {
    root.setAttribute('data-theme', root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  // 複製程式碼：優先用 Clipboard API，被拒絕（例如權限不足）時改用 execCommand
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  document.querySelectorAll('.copy-btn').forEach(function (button) {
    var label = button.querySelector('span');
    button.addEventListener('click', function () {
      var pre = button.closest('.code-block').querySelector('pre');
      copyText(pre ? pre.innerText : '').then(function () {
        button.classList.add('copied');
        label.textContent = '已複製';
        setTimeout(function () {
          button.classList.remove('copied');
          label.textContent = '複製';
        }, 1500);
      });
    });
  });

  // Expand every collapsed section that contains the target before jumping to it
  function revealTarget(id) {
    for (var node = document.getElementById(id); node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
  }
  window.addEventListener('hashchange', function () {
    revealTarget(decodeURIComponent(location.hash.slice(1)));
  });

  // 目錄標示目前章節：最後一個已經捲過畫面上緣的標題
  var links = {};
  document.querySelectorAll('.toc-link').forEach(function (link) {
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    links[id] = link;
    link.addEventListener('click', function () { revealTarget(id); });
  });
  var headings = Array.prototype.filter.call(document.querySelectorAll('.nb-content h1[id], .nb-content h2[id], .nb-content h3[id]'), function (h) {
    return links[h.id];
  });
  if (!headings.length) return;
  var activeLink = null;
  var pending = false;
  function updateActive() {
    pending = false;
    var current = headings[0];
    for (var i = 0; i < headings.length; i++) {
      // Headings inside a collapsed section have no layout box; skip them
      if (!headings[i].getClientRects().length) continue;
      if (headings[i].getBoundingClientRect().top <= 120) current = headings[i];
      else break;
    }
    var link = links[current.id];
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove('active');
    link.classList.add('active');
    activeLink = link;
  }
  window.addEventListener('scroll', function () {
    if (!pending) { pending = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  updateActive();
})();
`

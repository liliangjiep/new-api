# -*- coding: utf-8 -*-
"""抓取原站各视频工具页面板结构摘要（原站 vs 本地）。"""
import sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
PATHS = ["/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase", "/toolbox/video-watermark-remove"]

JS = """() => {
  const root = document.querySelector('.toolbox-editor-panel-root');
  if (!root) return 'NO ROOT';
  const R = e => { const r = e.getBoundingClientRect();
    return '[' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ']'; };
  const lines = [];
  const walk = (e, d) => {
    const al = e.getAttribute('aria-label');
    let s = '  '.repeat(d) + '<' + e.tagName.toLowerCase()
      + (e.className && typeof e.className === 'string' ? ' .' + e.className.trim().split(/\\s+/).slice(0,4).join('.') : '')
      + (al ? ' aria=' + al : '') + '> ' + R(e);
    const t = Array.from(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join('|');
    if (t) s += ' TXT=' + t.slice(0, 24);
    lines.push(s);
    for (const c of e.children) walk(c, d + 1);
  };
  walk(root, 0);
  const credit = document.querySelector('.generation-submit-credit');
  lines.push('CREDIT font=' + (credit ? getComputedStyle(credit).fontFamily : '?'));
  const cls = document.querySelector('.credit-value');
  if (cls) lines.push('CREDITVALUE font=' + getComputedStyle(cls).fontFamily);
  return lines.join('\\n');
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for path in PATHS:
            for name, base in (("O", ORIG), ("U", LOCAL)):
                ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
                page = ctx.new_page()
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(4500)
                    out = page.evaluate(JS)
                    print(f"\n===== {name} {path} =====")
                    print(out)
                except Exception as e:
                    print(f"\n===== {name} {path} ERR {str(e)[:120]}")
                finally:
                    page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

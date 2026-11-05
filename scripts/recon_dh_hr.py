# -*- coding: utf-8 -*-
"""对比 digital-human 面板结构 + hot-video-remix 面板结构。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const root = document.querySelector('.toolbox-editor-panel-root');
  if (!root) return 'NO ROOT';
  const R = e => { const r = e.getBoundingClientRect();
    return '[' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ']'; };
  const lines = [];
  const walk = (e, d) => {
    if (d > 5) return;
    const cs = getComputedStyle(e);
    let s = '  '.repeat(d) + '<' + e.tagName.toLowerCase()
      + (typeof e.className === 'string' && e.className.trim() ? ' .' + e.className.trim().split(/\\s+/).slice(0,4).join('.') : '')
      + (e.getAttribute('aria-label') ? ' aria=' + e.getAttribute('aria-label') : '')
      + '> ' + R(e) + ' gap=' + cs.gap + ' pad=' + cs.padding;
    const t = Array.from(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join('|');
    if (t) s += ' TXT=' + t.slice(0, 26);
    lines.push(s);
    for (const c of e.children) walk(c, d + 1);
  };
  walk(root, 0);
  return lines.join('\\n');
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for path in ("/toolbox/digital-human", "/toolbox/hot-video-remix"):
            for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
                ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
                page = ctx.new_page()
                page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4500)
                print(f"\n===== {name} {path} =====")
                print(page.evaluate(JS))
                page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

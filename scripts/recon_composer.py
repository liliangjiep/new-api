# -*- coding: utf-8 -*-
"""对比 prompt-composer-root 内部 DOM 结构（原站 vs 本地）。"""
import sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """() => {
  const root = document.querySelector('.prompt-composer-root');
  if (!root) return 'NOT FOUND';
  const R = e => { const r = e.getBoundingClientRect();
    return '[' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ']'; };
  const lines = [];
  const walk = (e, d) => {
    const cs = getComputedStyle(e);
    let s = '  '.repeat(d) + '<' + e.tagName.toLowerCase()
      + (typeof e.className === 'string' && e.className.trim() ? ' .' + e.className.trim().split(/\\s+/).slice(0,6).join('.') : '')
      + '> ' + R(e) + ' pad=' + cs.padding + ' disp=' + cs.display;
    const t = Array.from(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join('|');
    if (t) s += ' TXT=' + t.slice(0, 30);
    lines.push(s);
    for (const c of e.children) walk(c, d + 1);
  };
  walk(root, 0);
  return lines.join('\\n');
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", ORIG), ("U", LOCAL)):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + "/toolbox/image-generation", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"===== {name} =====")
            print(page.evaluate(JS))
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

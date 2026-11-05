# -*- coding: utf-8 -*-
"""抓取原站 /toolbox/video-watermark-remove 面板 DOM 树。"""
import sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"

JS = """() => {
  const root = document.querySelector('.toolbox-editor-panel-root');
  if (!root) return 'NO ROOT';
  const walk = (e, d) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    let s = '  '.repeat(d) + '<' + e.tagName.toLowerCase()
      + (e.className && typeof e.className === 'string' ? ' .' + e.className.trim().split(/\\s+/).join('.') : '')
      + (e.getAttribute('aria-label') ? ' aria-label=' + e.getAttribute('aria-label') : '')
      + '> [' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ']'
      + ' fs=' + cs.fontSize + ' pad=' + cs.padding + ' gap=' + cs.gap;
    const txt = Array.from(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join('|');
    if (txt) s += ' TXT=' + txt.slice(0, 40);
    s += '\\n';
    for (const c of e.children) s += walk(c, d + 1);
    return s;
  };
  return walk(root, 0);
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(ORIG + "/toolbox/video-watermark-remove", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)
    out = page.evaluate(JS)
    print(out if isinstance(out, str) else json.dumps(out, ensure_ascii=False, indent=1))
    br.close()

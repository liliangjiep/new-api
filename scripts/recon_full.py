# -*- coding: utf-8 -*-
"""抓取原站/本地页面元素的【完整 className + inline style + 关键结构】，
不做类名过滤，用于 1:1 复刻。

用法: python scripts/recon_full.py <base_url> <path> <out.txt> [maxdepth]
"""
import json, sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
MAXD = int(sys.argv[4]) if len(sys.argv) > 4 else 12

JS = """(maxd) => {
  const SKIP = new Set(['SCRIPT','STYLE','NEXT-ROUTE-ANNOUNCER','LINK','META']);
  const lines = [];
  const walk = (el, d) => {
    if (d > maxd) return;
    if (SKIP.has(el.tagName)) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const attrs = [];
    for (const a of ['role','aria-label','type','placeholder','href','title','alt','src','aria-current','aria-expanded','aria-selected','aria-checked']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) attrs.push(a + '=' + v.slice(0, 120));
    }
    const st = el.getAttribute('style');
    let line = '  '.repeat(d) + '<' + el.tagName.toLowerCase()
      + ' [' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ']'
      + (own ? ' "' + own.slice(0, 80) + '"' : '');
    const cls = (el.getAttribute('class') || '').replace(/\\s+/g, ' ').trim();
    if (cls) line += ' .' + cls;
    if (st) line += ' STYLE{' + st + '}';
    if (attrs.length) line += ' {' + attrs.join(' ') + '}';
    lines.push(line);
    for (const c of el.children) walk(c, d + 1);
  };
  for (const el of document.body.children) walk(el, 0);
  return lines.join('\\n');
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    text = page.evaluate(JS, MAXD)
    if out:
        open(out, "w", encoding="utf-8").write(text)
        print("wrote", out, len(text))
    else:
        print(text)
    ctx.close()
    b.close()

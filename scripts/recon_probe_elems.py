# -*- coding: utf-8 -*-
"""针对 class 为空（内联样式/继承样式）的元素，输出父链 + 索引，便于定位。
用法: python scripts/recon_probe_elems.py <base> <path> <n>
"""
import sys, json
from playwright.sync_api import sync_playwright

JS = """
() => {
  const out = [];
  const nodes = document.body.querySelectorAll('*');
  let i = 0;
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    if (['script','style','noscript','meta','link','title','head'].includes(tag)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
    const cls = (typeof el.className === 'string' ? el.className : '');
    const parent = el.parentElement;
    const pc = parent && typeof parent.className === 'string' ? parent.className : '';
    out.push({
      i: i++, tag, cls, pcls: pc.slice(0,80), ptag: parent ? parent.tagName.toLowerCase() : '',
      txt: own.slice(0,30),
      r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
      color: cs.color, bg: cs.backgroundColor,
    });
  }
  return out;
}
"""

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(3000)
    res = page.evaluate(JS)
    ctx.close(); b.close()

keys = {"fs","fw","lh","ls","color","bg"}
if len(sys.argv) > 3:
    keys = set(sys.argv[3].split(","))
for n in res:
    if n["cls"]:
        continue
    print(json.dumps({k: n[k] for k in ["i","tag","ptag","pcls","txt","r"] + sorted(keys)}, ensure_ascii=False))

# -*- coding: utf-8 -*-
"""hot-video-remix 内层高度对照（单页，超时保护）。"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const q = (s) => document.querySelector(s);
  const r = (el) => { if(!el) return null; const b = el.getBoundingClientRect();
    return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const edit = q('.toolbox-edit-region');
  const inner = [];
  if (edit) edit.querySelectorAll('div').forEach(d => {
    const c = String(d.className||'');
    if (c.includes('lg:flex-1') && c.includes('pr-1')) inner.push(c.slice(0,200) + ' => ' + JSON.stringify(r(d)));
  });
  return {
    edit: r(edit),
    inner: inner.slice(0,3),
    editorContent: r(q('.editor-content')),
  };
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    for base in ("https://susu.da-ai.cc", "http://localhost:3000"):
        ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = ctx.new_page()
        try:
            pg.goto(base + "/toolbox/hot-video-remix", wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(5000)
            print(base, json.dumps(pg.evaluate(JS), ensure_ascii=False), flush=True)
        except Exception as e:
            print(base, "ERR", str(e)[:150], flush=True)
        pg.close(); ctx.close()
    br.close()
print("DONE", flush=True)

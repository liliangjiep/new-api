# -*- coding: utf-8 -*-
"""按 DOM 路径配对原站/本地元素，输出 class 差异。"""
import sys, json, difflib
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const root = document.querySelector('.toolbox-editor-panel-root') || document.body;
  const out = [];
  const walk = (e, path) => {
    const al = e.getAttribute('aria-label');
    const r = e.getBoundingClientRect();
    out.push({
      path: path,
      tag: e.tagName.toLowerCase(),
      cls: typeof e.className === 'string' ? e.className : '',
      al: al,
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      txt: (e.textContent||'').trim().slice(0,30),
    });
    const kids = Array.from(e.children);
    kids.forEach((c,i) => walk(c, path + '/' + i));
  };
  walk(root, '');
  return out;
}"""

def norm(items):
    return [f"{i['path']}|{i['tag']}|{i['al']}|{i['cls']}" for i in items]

def main():
    path = sys.argv[1]
    with sync_playwright() as p:
        br = p.chromium.launch()
        res = {}
        for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            res[name] = page.evaluate(JS)
            page.close(); ctx.close()
        br.close()
    o = {i["path"]: i for i in res["O"]}
    u = {i["path"]: i for i in res["U"]}
    print("### class diffs")
    for pth in sorted(set(o) | set(u)):
        a, b = o.get(pth), u.get(pth)
        if not a: print(f"EXTRA {pth} {b['tag']} {b['cls'][:150]}"); continue
        if not b: print(f"MISSING {pth} {a['tag']} {a['cls'][:150]}"); continue
        if a["cls"] != b["cls"]:
            ca = set(a["cls"].split()); cb = set(b["cls"].split())
            print(f"DIFF {pth} {a['tag']}")
            print(f"   O-only: {sorted(ca-cb)}")
            print(f"   U-only: {sorted(cb-ca)}")
        if a["rect"] != b["rect"]:
            print(f"RECT {pth} {a['tag']} O={a['rect']} U={b['rect']}")

if __name__ == "__main__":
    main()

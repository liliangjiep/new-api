# -*- coding: utf-8 -*-
"""精确提取某站某页面的某个区域（按 CSS 选择器）的完整结构 + 文本 + 计算样式。
用法: python scripts/recon_region.py <base_url> <path> <selector> [outfile]
"""
import json, sys, os
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sel = sys.argv[3]
out = sys.argv[4] if len(sys.argv) > 4 else None

JS = """
(sel) => {
  const root = document.querySelector(sel);
  if (!root) return { error: 'selector not found: ' + sel };
  const props = ['display','flexDirection','gap','padding','margin','position','width','height','minWidth','maxWidth',
    'backgroundColor','color','borderRadius','border','fontSize','fontWeight','lineHeight','overflow','overflowY',
    'gridTemplateColumns','gridTemplateRows','alignItems','justifyContent','flexWrap','boxShadow','opacity','zIndex','textAlign'];
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs[p];
    return o;
  };
  const node = (el, depth) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const o = {
      t: el.tagName.toLowerCase(),
      cls: el.className && typeof el.className === 'string' ? el.className : '',
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      own: own.slice(0, 200),
      style: styleOf(el),
      attrs: {},
    };
    for (const k of ['role','aria-label','type','placeholder','href','value','aria-current','aria-selected','aria-expanded','disabled','name','id','title','alt','src','data-state']) {
      const v = el.getAttribute && el.getAttribute(k);
      if (v) o.attrs[k] = v.slice(0, 300);
    }
    if (el.tagName === 'IMG') o.attrs.src = (el.getAttribute('src')||'').slice(0,300);
    o.kids = Array.from(el.children).map(c => node(c, depth + 1));
    return o;
  };
  return { url: location.href, title: document.title, root: node(root, 0) };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    data = page.evaluate(JS, sel)
    ctx.close(); b.close()

if out:
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("saved", out)
else:
    def pr(n, depth=0):
        r = n.get("r", [0,0,0,0])
        s = n.get("style", {})
        keep = {k: v for k, v in s.items() if v not in ("none", "auto", "normal", "0px", "rgba(0, 0, 0, 0)", "static", "visible", "row", "baseline", "start", "stretch", "wrap", "0s", "1")}
        print("  "*depth + f'<{n["t"]} {r} cls="{n["cls"][:90]}"' +
              (f' TEXT="{n["own"]}"' if n.get("own") else "") +
              (f' attrs={n["attrs"]}' if n.get("attrs") else ""))
        if keep:
            print("  "*(depth+1) + "style: " + json.dumps(keep, ensure_ascii=False))
        for k in n.get("kids", []):
            pr(k, depth+1)
    if "error" in data:
        print("ERROR", data["error"])
    else:
        pr(data["root"])

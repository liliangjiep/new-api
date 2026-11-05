# -*- coding: utf-8 -*-
"""对比两站关键元素的计算样式（font / color / radius / size）。
用法: python scripts/recon_style_live.py <origbase> <oursbase> <selector> [path]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const keep = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color',
    'backgroundColor','borderRadius','borderTopWidth','borderTopColor','paddingTop','paddingLeft',
    'paddingRight','paddingBottom','marginTop','marginBottom','boxShadow','gap','display',
    'flexDirection','alignItems','justifyContent','minHeight','height','width','maxWidth','opacity'];
  const o = {};
  for (const k of keep) o[k] = cs[k];
  o.rect = [Math.round(r.width), Math.round(r.height)];
  o.text = (el.innerText||'').trim().replace(/\s+/g,' ').slice(0,40);
  return o;
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    sel = sys.argv[3]
    paths = sys.argv[4:] or ["/"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            for tag, base in (("O", ob), ("X", ub)):
                page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(6000)
                d = page.evaluate(JS, sel)
                print(f"--- {tag} {path} {sel}")
                if not d:
                    print("    (not found)")
                    continue
                for k, v in d.items():
                    print(f"    {k}: {v}")
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()

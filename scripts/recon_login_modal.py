# -*- coding: utf-8 -*-
"""抓原站首页 ?login=1 弹窗（登录/注册）的 DOM + 计算样式。
用法: python scripts/recon_login_modal.py <base> <outfile>
"""
import json, sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const dlg = document.querySelector('[role=dialog], .auth-dialog, [class*=auth]');
  if (!dlg) return {noDialog:true};
  const out = [];
  const walk = (el, d) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out.push({d, t: el.tagName.toLowerCase(), c: (el.className||'').toString().slice(0,90),
      o: (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,50),
      r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      bg: cs.backgroundColor, br: cs.borderRadius, sh: cs.boxShadow,
      pos: cs.position, z: cs.zIndex, disp: cs.display});
    for (const c of el.children) walk(c, d+1);
  };
  walk(dlg, 0);
  return {tree: out, cls: dlg.className, tag: dlg.tagName};
}"""

def main():
    base = sys.argv[1].rstrip("/")
    out = sys.argv[2]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/?login=1", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(6000)
        d = page.evaluate(JS)
        json.dump(d, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("nodes:", len(d.get("tree", [])), "cls:", str(d.get("cls"))[:100])
        for n in d.get("tree", [])[:40]:
            print("  " * n["d"], n["t"], "|", n["c"][:70], "|", n["o"][:40], "|", n["r"])
        ctx.close(); b.close()

if __name__ == "__main__":
    main()

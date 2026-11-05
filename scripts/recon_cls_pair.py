# -*- coding: utf-8 -*-
"""按语义类名前缀，输出原站 vs 我方的完整 class 字符串对照。
用法: python scripts/recon_cls_pair.py <origbase> <oursbase> <path> <prefix> [prefix ...]
"""
import sys, json
from playwright.sync_api import sync_playwright

JS = """
(prefixes) => {
  const out = {};
  for (const p of prefixes) {
    out[p] = Array.from(document.querySelectorAll('[class*="' + p + '"]')).map(el => ({
      t: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : ''),
      txt: (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,30),
    }));
  }
  return out;
}
"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    path = sys.argv[3]
    prefixes = sys.argv[4:]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        data = {}
        for tag, base in (("ORIG", ob), ("OURS", ub)):
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(3500)
            data[tag] = page.evaluate(JS, prefixes)
            page.close()
        for pre in prefixes:
            o = data["ORIG"].get(pre, [])
            x = data["OURS"].get(pre, [])
            print(f"\n########## {pre}   orig={len(o)} ours={len(x)}")
            for i in range(max(len(o), len(x))):
                ov = o[i] if i < len(o) else None
                xv = x[i] if i < len(x) else None
                oc = ov["cls"] if ov else "(none)"
                xc = xv["cls"] if xv else "(none)"
                mark = "  " if oc == xc else "**"
                print(f"{mark} ORIG: {oc}")
                print(f"{mark} OURS: {xc}")
                if ov and xv and ov.get("txt") != xv.get("txt"):
                    print(f"     txt orig={ov.get('txt')!r} ours={xv.get('txt')!r}")
        ctx.close(); b.close()

if __name__ == "__main__":
    main()

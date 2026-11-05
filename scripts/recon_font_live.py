# -*- coding: utf-8 -*-
"""对比两站 body / html 的 font-family 与相关基础样式。
用法: python scripts/recon_font_live.py <origbase> <oursbase>
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {ff: cs.fontFamily, fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight,
            fvs: cs.fontVariationSettings, ft: cs.fontFeatureSettings, ts: cs.textRendering,
            fstyle: cs.fontStyle, fk: cs.fontKerning};
  };
  const fonts = new Set();
  document.fonts && document.fonts.forEach(f => fonts.add(f.family + ' ' + f.style + ' ' + f.weight));
  return {html: g('html'), body: g('body'), fonts: Array.from(fonts)};
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        for tag, base in (("O", ob), ("X", ub)):
            page.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(5000)
            d = page.evaluate(JS)
            print(f"--- {tag}")
            for k in ("html", "body"):
                print(f"    {k}: {d[k]}")
            print("    loaded fonts:", d["fonts"][:20])
        page.close(); ctx.close(); b.close()

if __name__ == "__main__":
    main()

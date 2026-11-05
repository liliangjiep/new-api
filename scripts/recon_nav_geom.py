# -*- coding: utf-8 -*-
"""对比原站/本地 左侧导航（workspace-sidebar / pinned-navigation）几何与结构。
用法: python scripts/recon_nav_geom.py <base>
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = {};
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {c: el.className.toString().slice(0, 90), r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
            disp: cs.display, pos: cs.position, ov: cs.overflow};
  };
  for (const s of ['.workspace-shell', '.workspace-sidebar', '.workspace-pinned-navigation',
                   '.workspace-main-shell', '.workspace-main-content', '.genify-toolbox-3col',
                   '.toolbox-edit-region', '.toolbox-preview-region', '.toolbox-queue-region']) {
    out[s] = pick(s);
  }
  const sb = document.querySelector('.workspace-sidebar');
  out.sidebarChildren = sb ? Array.from(sb.children).map(c => {
    const r = c.getBoundingClientRect();
    return {c: c.className.toString().slice(0, 70), r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]};
  }) : null;
  return out;
}"""

async def main():
    base = sys.argv[1].rstrip("/")
    path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)
        res = await pg.evaluate(JS)
        print("==", base)
        for k, v in res.items():
            if k == "sidebarChildren":
                print(" sidebarChildren:")
                for c in (v or []):
                    print("   ", c["r"], c["c"])
            elif v:
                print(f" {k}: {v['r']} | {v['c']} | {v['disp']}/{v['pos']}/{v['ov']}")
            else:
                print(f" {k}: MISSING")
        await b.close()

asyncio.run(main())

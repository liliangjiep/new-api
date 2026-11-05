# -*- coding: utf-8 -*-
"""检查 depth 页「新建」按钮 82 vs 80 的成因（字体族 / 字体加载）。
用法: python scripts/recon_fine3.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const els = Array.from(document.querySelectorAll('.ui-button')).filter(e => (e.innerText||'').trim() === '新建');
  if (!els.length) return null;
  const e = els[0];
  const cs = getComputedStyle(e);
  const fonts = Array.from(document.fonts).map(f => [f.family, f.status, f.weight]);
  return {fontFamily: cs.fontFamily, fonts, textNodeW: (() => {
    const r = document.createRange(); r.selectNodeContents(e);
    return r.getBoundingClientRect().width;
  })()};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/toolbox/depth-video-clone", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(8000)
            r = await pg.evaluate(JS)
            print("==", label)
            print("   fontFamily:", r and r["fontFamily"])
            print("   textNodeW:", r and r["textNodeW"])
            print("   fonts:", r and r["fonts"][:6])
            await pg.close()
        await b.close()

asyncio.run(main())

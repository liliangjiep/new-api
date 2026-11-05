# -*- coding: utf-8 -*-
"""时间序列探测原站轮播 next/prev 的边界行为。
用法: python scripts/recon_carousel_edge.py <base>
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const track = document.querySelector('.result-example-track');
  const slides = Array.from(document.querySelectorAll('.result-example-slide'));
  const inds = Array.from(document.querySelectorAll('.result-example-indicator'));
  const m = track ? getComputedStyle(track).transform : '';
  const tx = m && m !== 'none' ? Math.round(parseFloat(m.split(',')[4])) : 0;
  return {
    tx,
    active: inds.findIndex(b => b.className.includes('w-5')),
    visibleSrc: (() => {
      const vp = document.querySelector('.result-example-viewport').getBoundingClientRect();
      const s = slides.find(s => { const r = s.getBoundingClientRect(); return r.left >= vp.left - 2 && r.left < vp.right; });
      if (!s) return null;
      const i = s.querySelector('img');
      return i ? i.getAttribute('src').split('/').pop() : null;
    })(),
  };
}"""

async def snap(pg, label):
    st = await pg.evaluate(JS)
    print(f"   {label}: tx={st['tx']} active={st['active']} visible={st['visibleSrc']}")
    return st

async def main():
    base = sys.argv[1].rstrip("/")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto(base + "/toolbox/ecommerce-image-set", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)
        await snap(pg, "initial")
        await pg.hover(".result-example-carousel")
        nxt = pg.locator(".result-example-next")
        prev = pg.locator(".result-example-prev")

        print("\n[A] prev at first (wrap backwards)")
        await prev.first.click(force=True)
        for t in [100, 400, 800, 1400, 2000]:
            await pg.wait_for_timeout(t if t == 100 else t - 0)
            await snap(pg, f"  t~{t}")

        print("\n[B] next at last (wrap forwards)")
        inds = pg.locator(".result-example-indicator")
        n = await inds.count()
        await inds.nth(n - 1).click()
        await pg.wait_for_timeout(1500)
        await snap(pg, "  after click last indicator")
        await pg.hover(".result-example-carousel")
        await nxt.first.click(force=True)
        for t in [100, 400, 800, 1400, 2200]:
            await pg.wait_for_timeout(t)
            await snap(pg, f"  t+{t}")

        print("\n[C] click indicator 0 then prev")
        await inds.nth(0).click()
        await pg.wait_for_timeout(1500)
        await snap(pg, "  at indicator 0")
        await pg.hover(".result-example-carousel")
        await prev.first.click(force=True)
        await pg.wait_for_timeout(1600)
        await snap(pg, "  after prev")
        await b.close()

asyncio.run(main())

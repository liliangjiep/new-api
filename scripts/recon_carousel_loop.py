# -*- coding: utf-8 -*-
"""探测原站轮播的无限循环语义（克隆 slide / prev 越界回弹）。
用法: python scripts/recon_carousel_loop.py <base>
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
  const w = track ? Math.round(track.getBoundingClientRect().width) : 0;
  return {
    tx, w, step: w,
    slideCount: slides.length,
    indicatorCount: inds.length,
    activeIndicator: inds.findIndex(b => b.className.includes('w-5')),
    srcs: slides.map(s => { const i = s.querySelector('img'); return i ? i.getAttribute('src').split('/').pop() : null; }),
    pe: slides.map(s => s.className.includes('pointer-events-none') ? 0 : 1),
  };
}"""

async def main():
    base = sys.argv[1].rstrip("/")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto(base + "/toolbox/ecommerce-image-set", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)
        print("initial:", await pg.evaluate(JS))
        await pg.hover(".result-example-carousel")
        await pg.wait_for_timeout(300)
        prev = pg.locator(".result-example-prev")
        for i in range(2):
            await prev.first.click(force=True)
            await pg.wait_for_timeout(120)
            print(f"prev{i+1}(immediately):", (await pg.evaluate(JS))["tx"], (await pg.evaluate(JS))["activeIndicator"])
            await pg.wait_for_timeout(900)
            st = await pg.evaluate(JS)
            print(f"prev{i+1}(settled): tx={st['tx']} active={st['activeIndicator']}")
        # go to last indicator then next
        inds = pg.locator(".result-example-indicator")
        n = await inds.count()
        await inds.nth(n - 1).click()
        await pg.wait_for_timeout(900)
        st = await pg.evaluate(JS)
        print(f"lastIndicator: tx={st['tx']} active={st['activeIndicator']} src={st['srcs']}")
        await pg.hover(".result-example-carousel")
        nxt = pg.locator(".result-example-next")
        await nxt.first.click(force=True)
        await pg.wait_for_timeout(150)
        st = await pg.evaluate(JS)
        print(f"nextAtEnd(immediately): tx={st['tx']} active={st['activeIndicator']}")
        await pg.wait_for_timeout(1200)
        st = await pg.evaluate(JS)
        print(f"nextAtEnd(settled): tx={st['tx']} active={st['activeIndicator']} pe={st['pe']}")
        await b.close()

asyncio.run(main())

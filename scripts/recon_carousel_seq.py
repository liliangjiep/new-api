# -*- coding: utf-8 -*-
"""连续点击 next 15 次，记录原站/本地每一步的可见图与 active 指示器，判定 wrap/clamp 语义。
用法: python scripts/recon_carousel_seq.py <base>
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const slides = Array.from(document.querySelectorAll('.result-example-slide'));
  const inds = Array.from(document.querySelectorAll('.result-example-indicator'));
  const vp = document.querySelector('.result-example-viewport').getBoundingClientRect();
  let vis = -1;
  slides.forEach((s, i) => { const r = s.getBoundingClientRect(); if (vis < 0 && r.left >= vp.left - 2 && r.left < vp.right) vis = i; });
  const s = vis >= 0 ? slides[vis] : null;
  const img = s ? s.querySelector('img') : null;
  return {
    slideIdx: vis,
    visible: img ? img.getAttribute('src').split('/').pop() : null,
    active: inds.findIndex(b => b.className.includes('w-5')),
    nSlides: slides.length, nInd: inds.length,
  };
}"""

async def main():
    base = sys.argv[1].rstrip("/")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto(base + "/toolbox/ecommerce-image-set", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)
        st = await pg.evaluate(JS)
        print(f"initial: slide={st['slideIdx']} visible={st['visible']} active={st['active']} nSlides={st['nSlides']} nInd={st['nInd']}")
        nxt = pg.locator(".result-example-next")
        for i in range(1, 16):
            await pg.hover(".result-example-carousel")
            await pg.wait_for_timeout(150)
            await nxt.first.click(force=True)
            await pg.wait_for_timeout(900)
            st = await pg.evaluate(JS)
            print(f"next{i:>2}: slide={st['slideIdx']} visible={st['visible']} active={st['active']}")
        await b.close()

asyncio.run(main())

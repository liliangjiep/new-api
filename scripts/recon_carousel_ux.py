# -*- coding: utf-8 -*-
"""对比原站/本地 电商套图轮播的交互行为：
 - 初始态：哪个 slide 可见、track transform
 - 点击「下一个」后：可见 slide、指示器 active 索引、track transform
 - 指示器数量与 slide 数量关系
用法: python scripts/recon_carousel_ux.py
"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const track = document.querySelector('.result-example-track');
  const slides = Array.from(document.querySelectorAll('.result-example-slide'));
  const inds = Array.from(document.querySelectorAll('.result-example-indicator'));
  const vis = slides.findIndex(s => { const r = s.getBoundingClientRect(); return r.left >= -1 && r.left < window.innerWidth; });
  return {
    trackTransform: track ? getComputedStyle(track).transform : null,
    slideCount: slides.length,
    indicatorCount: inds.length,
    visibleSlideIndex: vis,
    visibleImg: vis >= 0 ? (slides[vis].querySelector('img')||{}).currentSrc : null,
    activeIndicator: inds.findIndex(b => b.className.includes('w-5')),
    slideClasses: slides.map(s => s.className),
    imgSrcs: slides.map(s => { const i = s.querySelector('img'); return i ? i.getAttribute('src') : null; }),
  };
}"""

async def probe(base, label):
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = await ctx.new_page()
        await pg.goto(base + "/toolbox/ecommerce-image-set", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)
        out["initial"] = await pg.evaluate(JS)
        # hover carousel to reveal next button
        await pg.hover(".result-example-carousel")
        await pg.wait_for_timeout(400)
        nxt = pg.locator(".result-example-next")
        for i in range(3):
            if await nxt.count():
                await nxt.first.click(force=True)
                await pg.wait_for_timeout(800)
            out[f"afterNext{i+1}"] = await pg.evaluate(JS)
        # click indicator #2
        inds = pg.locator(".result-example-indicator")
        if await inds.count() > 1:
            await inds.nth(1).click()
            await pg.wait_for_timeout(800)
            out["afterIndicator2"] = await pg.evaluate(JS)
        await b.close()
    return out

async def main():
    for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
        res = await probe(base, label)
        print("=" * 20, label, "=" * 20)
        for k, v in res.items():
            print(f"-- {k}")
            for kk in ["slideCount", "indicatorCount", "visibleSlideIndex", "activeIndicator", "trackTransform", "visibleImg"]:
                print(f"     {kk}: {v.get(kk)}")
            print("     imgSrcs:", [s.split('/')[-1] if s else None for s in v["imgSrcs"]])

asyncio.run(main())

# -*- coding: utf-8 -*-
"""实时核对 P1 项：缺失浮层 / 多余 section / backdrop-blur 容器 / 瀑布流卡片高度。"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = {};
  const sel = ['.feature-guide-popover', '.generation-skill-panel', '.generation-skill-card-select',
               'section[aria-label="水印区"]', '.backdrop-blur-lg', '.ui-waterfall-item'];
  for (const s of sel) {
    const els = Array.from(document.querySelectorAll(s));
    out[s] = els.slice(0, 6).map(el => {
      const b = el.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    });
  }
  out['__wf_imgs'] = Array.from(document.querySelectorAll('.ui-waterfall-item img')).slice(0, 40).map(img => {
    const b = img.getBoundingClientRect();
    return [Math.round(b.width), Math.round(b.height), img.naturalWidth, img.naturalHeight,
            (img.currentSrc||'').split('/').pop().slice(0,40)];
  });
  return out;
}"""

PAGES = ["/toolbox/depth-video-clone", "/toolbox/video-watermark-remove",
         "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase", "/"]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            for path in PAGES:
                pg = await ctx.new_page()
                try:
                    await pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                    await pg.wait_for_timeout(6000)
                    r = await pg.evaluate(JS)
                    print(f"== {label} {path}")
                    for k, v in r.items():
                        if k == "__wf_imgs":
                            print(f"   {k}: n={len(v)}")
                            for x in v:
                                print("      ", x)
                        else:
                            print(f"   {k}: n={len(v)} {v}")
                except Exception as e:
                    print(f"== {label} {path} ERR {str(e)[:120]}")
                await pg.close()
        await b.close()

asyncio.run(main())

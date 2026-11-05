# -*- coding: utf-8 -*-
"""对比原站 .home-spotlight-backdrop 与我们 .home-landing-blue-wash-center。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = [];
  for (const s of ['.home-spotlight-backdrop', '.home-landing-blue-wash-center', '.home-entry-scene-section', '.home-entry-mobile']) {
    const el = document.querySelector(s);
    if (!el) { out.push([s, null]); continue; }
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push([s, {
      cls: String(el.className).slice(0,140),
      r: [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],
      bg: cs.backgroundImage.slice(0,120), mask: cs.maskImage.slice(0,100),
      webkitMask: cs.webkitMaskImage.slice(0,100),
      filter: cs.filter, opacity: cs.opacity, pos: cs.position,
      inset: cs.inset, z: cs.zIndex, transform: cs.transform.slice(0,80),
      pointerEvents: cs.pointerEvents,
    }]);
  }
  return out;
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            print(f"== {label}")
            for s, v in await pg.evaluate(JS):
                print("  ", s, json.dumps(v, ensure_ascii=False)[:600] if v else None)
            await pg.close()
        await b.close()

asyncio.run(main())

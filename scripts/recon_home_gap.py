# -*- coding: utf-8 -*-
"""对比首页「场景卡区 → 瀑布流区」之间的间距来源。
用法: python scripts/recon_home_gap.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const sels = ['.home-entry-scene-section', '.home-discover-section', '.home-discover-content',
                '.ui-waterfall', '.home-entry-scene-header', '.home-entry-scene-list'];
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[s] = {r: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
              mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pb: cs.paddingBottom};
  }
  // 场景 section 与 discover section 之间的兄弟节点
  const scene = document.querySelector('.home-entry-scene-section');
  let sib = scene ? scene.nextElementSibling : null;
  const sibs = [];
  while (sib && sibs.length < 3) {
    const b = sib.getBoundingClientRect();
    const cs = getComputedStyle(sib);
    sibs.push([(sib.className||'').toString().slice(0,50), Math.round(b.y), Math.round(b.height), cs.marginTop]);
    sib = sib.nextElementSibling;
  }
  return {out, sibs};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            r = await pg.evaluate(JS)
            print("==", label)
            for k, v in r["out"].items():
                print(f"   {k}: {v}")
            print("   sibs:", r["sibs"])
            await pg.close()
        await b.close()

asyncio.run(main())

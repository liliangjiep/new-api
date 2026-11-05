# -*- coding: utf-8 -*-
"""定位剩余两个细节差异：
 1) 首页 .discover-card 文字色 23 vs 24
 2) depth 页「新建」按钮宽 82 vs 80
用法: python scripts/recon_fine2.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS_HOME = """() => {
  const card = document.querySelector('.discover-card');
  const cs = card ? getComputedStyle(card) : null;
  const info = cs ? {color: cs.color, opacity: cs.opacity, fill: cs.fill} : null;
  // 找出哪个祖先设置了 color
  const chain = [];
  let e = card;
  while (e && e !== document.documentElement) {
    const c = getComputedStyle(e);
    chain.push([(e.className||'').toString().slice(0,45), c.color, c.opacity]);
    e = e.parentElement;
  }
  const html = getComputedStyle(document.documentElement);
  return {info, chain, htmlColor: html.color, bodyColor: getComputedStyle(document.body).color};
}"""

JS_BTN = """() => {
  const els = Array.from(document.querySelectorAll('.ui-button')).filter(e => (e.innerText||'').trim() === '新建');
  if (!els.length) return null;
  const e = els[0];
  const cs = getComputedStyle(e);
  const b = e.getBoundingClientRect();
  return {rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
          cls: (e.className||'').toString(),
          fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.slice(0,50),
          letterSpacing: cs.letterSpacing, padding: cs.padding, gap: cs.gap, width: cs.width,
          borderWidth: cs.borderWidth, boxSizing: cs.boxSizing, minWidth: cs.minWidth};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            print("== HOME", label, await pg.evaluate(JS_HOME))
            await pg.close()
            pg = await ctx.new_page()
            await pg.goto(base + "/toolbox/depth-video-clone", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            print("== DEPTH", label, await pg.evaluate(JS_BTN))
            await pg.close()
        await b.close()

asyncio.run(main())

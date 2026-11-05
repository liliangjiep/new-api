# -*- coding: utf-8 -*-
"""关键 token / 计算样式对比（前景色、边框色、圆角、字号）。
用法: python scripts/recon_tokens.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const g = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p).trim();
    const r = el.getBoundingClientRect();
    o._rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    return o;
  };
  const body = getComputedStyle(document.body);
  const root = getComputedStyle(document.documentElement);
  return {
    body: {color: body.color, bg: body.backgroundColor, fs: body.fontSize, ff: body.fontFamily.slice(0,40)},
    tokens: {
      foreground: root.getPropertyValue('--foreground').trim(),
      accent: root.getPropertyValue('--accent').trim(),
      border: root.getPropertyValue('--border').trim(),
      muted: root.getPropertyValue('--muted').trim(),
      radiusXL: root.getPropertyValue('--radius-xl').trim(),
      radius2xl: root.getPropertyValue('--radius-2xl').trim(),
    },
    uiWaterfallItem: g('.ui-waterfall-item', ['color','font-size','background-color','border-radius']),
    uiButton: g('.ui-button', ['border-radius','font-size','padding','background-color','color','gap','height']),
    selectorTrigger: g('.toolbox-selector-trigger', ['border-color','border-radius','font-size','height']),
    sceneCard: g('.home-entry-scene-card', ['color','font-size','border-radius']),
    anyCard: g('.card', ['border-radius','box-shadow','background-color','border-color']),
  };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in ["/", "/toolbox/image-generation"]:
            print("#####", path)
            for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
                pg = await ctx.new_page()
                await pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                await pg.wait_for_timeout(6000)
                r = await pg.evaluate(JS)
                print("==", label)
                for k, v in r.items():
                    print("  ", k, ":", v)
                await pg.close()
        await b.close()

asyncio.run(main())

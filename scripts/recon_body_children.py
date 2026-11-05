# -*- coding: utf-8 -*-
"""对比原站/本地 body 首个子元素（style 标签位置）与 mobile bottombar 父级。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = {};
  out['__body_children'] = Array.from(document.body.children).map(c =>
    c.tagName.toLowerCase() + '.' + String(c.className||'').slice(0,50));
  const nb = document.querySelector('.workspace-mobile-bottombar');
  out['__bottombar'] = nb ? {
    parent: nb.parentElement.className,
    gp: nb.parentElement.parentElement ? nb.parentElement.parentElement.className : null,
    r: (b => [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)])(nb.getBoundingClientRect()),
  } : null;
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
            print(json.dumps(await pg.evaluate(JS), ensure_ascii=False, indent=1))
            await pg.close()
        await b.close()

asyncio.run(main())

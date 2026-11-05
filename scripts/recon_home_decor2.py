# -*- coding: utf-8 -*-
"""抓原站首页 home-decoration-workspace 内部结构树 + 我们对照。"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const res = [];
  const rec = (el, d) => {
    for (const c of el.children) {
      if (d > 3) continue;
      const b = c.getBoundingClientRect();
      res.push('  '.repeat(d) + c.tagName.toLowerCase() + '.' + String(c.className||'').slice(0,60) +
        ' [' + Math.round(b.x) + ',' + Math.round(b.y) + ',' + Math.round(b.width) + ',' + Math.round(b.height) + ']');
      rec(c, d + 1);
    }
  };
  const root = document.querySelector('.home-decoration-workspace');
  if (root) rec(root, 0);
  return res;
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
            print(f"== {label}")
            for x in r:
                print(x)
            await pg.close()
        await b.close()

asyncio.run(main())

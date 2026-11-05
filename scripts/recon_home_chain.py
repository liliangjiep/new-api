# -*- coding: utf-8 -*-
"""探查首页顶层 wrapper 层级 + 侧边栏项结构（原站 vs 本地）。"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = {};
  const chain = [];
  let el = document.querySelector('.page-home');
  while (el && el !== document.documentElement) {
    const b = el.getBoundingClientRect();
    chain.push([el.tagName.toLowerCase(), String(el.className||'').slice(0,70),
                Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
    el = el.parentElement;
  }
  out['__page_home_chain'] = chain;
  out['__sidebar_items'] = Array.from(document.querySelectorAll('.workspace-sidebar-item')).slice(0,8).map(a => {
    const b = a.getBoundingClientRect();
    return {cls: String(a.className).slice(0,60), parent: String(a.parentElement.className).slice(0,60),
            r: [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],
            text: (a.innerText||'').trim().replace(/\\s+/g,' ').slice(0,20)};
  });
  out['__tooltip_triggers'] = document.querySelectorAll('.ui-hover-tooltip-trigger').length;
  out['__decoration'] = Array.from(document.querySelectorAll('[class*=home-decoration]')).map(e => {
    const b = e.getBoundingClientRect();
    return [String(e.className).slice(0,70), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
  });
  return out;
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            r = await pg.evaluate(JS)
            print(f"== {label}")
            print("  chain:")
            for c in r["__page_home_chain"]:
                print("    ", c)
            print("  decoration:", r["__decoration"])
            print("  tooltip_triggers:", r["__tooltip_triggers"])
            print("  sidebar_items:")
            for s in r["__sidebar_items"]:
                print("    ", s)
            await pg.close()
        await b.close()

asyncio.run(main())

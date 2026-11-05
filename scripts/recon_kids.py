# -*- coding: utf-8 -*-
"""列出某个选择器的直接子节点对比。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    self: {cls:(el.getAttribute('class')||''), r:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10), disp:cs.display, jc:cs.justifyContent, gap:cs.gap, pad:cs.padding, ov:cs.overflowY},
    kids: Array.from(el.children).map(c=>{const cr=c.getBoundingClientRect(); const ccs=getComputedStyle(c);
      return {tag:c.tagName.toLowerCase(), cls:(c.getAttribute('class')||'').slice(0,120), r:[cr.x,cr.y,cr.width,cr.height].map(v=>Math.round(v*10)/10), disp:ccs.display, mt:ccs.marginTop, mb:ccs.marginBottom};})
  };
}"""

async def main():
    path, sel = sys.argv[1], sys.argv[2]
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for base, tag in ((ORIG, "ORIG"), (LOCAL, "OURS")):
            ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = await ctx.new_page()
            await page.goto(base+path, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(6000)
            d = await page.evaluate(JS, sel)
            print("="*20, tag, "="*20)
            print(json.dumps(d, ensure_ascii=False, indent=1))
            await ctx.close()
        await br.close()

asyncio.run(main())

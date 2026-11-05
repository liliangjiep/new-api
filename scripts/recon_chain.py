# -*- coding: utf-8 -*-
"""查询某选择器的祖先链 + 兄弟信息。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const chain = [];
  let n = el;
  while (n && n !== document.body) {
    const r = n.getBoundingClientRect(); const cs = getComputedStyle(n);
    chain.push({tag:n.tagName.toLowerCase(), cls:(n.getAttribute('class')||'').slice(0,110),
      r:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10), disp:cs.display, pos:cs.position});
    n = n.parentElement;
  }
  const sibs = el.parentElement ? Array.from(el.parentElement.children).map(c=>{
    const cr=c.getBoundingClientRect(); return {cls:(c.getAttribute('class')||'').slice(0,110), r:[cr.x,cr.y,cr.width,cr.height].map(v=>Math.round(v*10)/10)};
  }) : [];
  return {chain, sibs};
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
            for it in (d["chain"] if d else []):
                print(f"  {it['r']} {it['disp']:8s} {it['pos']:8s} {it['cls']}")
            print("  --siblings--")
            for it in (d["sibs"] if d else []):
                print(f"  {it['r']} {it['cls']}")
            await ctx.close()
        await br.close()

asyncio.run(main())

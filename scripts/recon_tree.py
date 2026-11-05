# -*- coding: utf-8 -*-
"""列出某个选择器内所有匹配后代（限制深度）的 rect/class 对比。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const out = [];
  const walk = (n, d) => {
    if (d > 4) return;
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    out.push({d, tag:n.tagName.toLowerCase(),
      cls:(n.getAttribute('class')||'').slice(0,90),
      r:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10),
      pt:cs.paddingTop, pb:cs.paddingBottom, mt:cs.marginTop, mb:cs.marginBottom, gap:cs.gap});
    Array.from(n.children).forEach(c=>walk(c,d+1));
  };
  walk(root,0);
  return out;
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
            for it in (d or []):
                print(f"{'  '*it['d']}[{it['r']}] pt={it['pt']} pb={it['pb']} mt={it['mt']} mb={it['mb']} gap={it['gap']}  {it['cls']}")
            await ctx.close()
        await br.close()

asyncio.run(main())

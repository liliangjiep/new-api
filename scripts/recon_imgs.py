# -*- coding: utf-8 -*-
"""列出某个选择器内所有 img 的 src / natural size / rect 对比。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const root = document.querySelector(sel) || document.body;
  return Array.from(root.querySelectorAll('img')).slice(0,20).map(im=>{
    const r = im.getBoundingClientRect(); const cs=getComputedStyle(im);
    return {src: im.currentSrc || im.src, nw: im.naturalWidth, nh: im.naturalHeight,
      r:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10),
      fit: cs.objectFit, br: cs.borderRadius, cls:(im.getAttribute('class')||'').slice(0,100)};
  });
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
            for it in d:
                print(f"  {it['r']}  n={it['nw']}x{it['nh']} fit={it['fit']} br={it['br']}  {it['src'][-110:]}")
            await ctx.close()
        await br.close()

asyncio.run(main())

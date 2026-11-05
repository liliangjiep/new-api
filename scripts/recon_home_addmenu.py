# -*- coding: utf-8 -*-
"""点击原站首页 composer 加号按钮，观察弹出的内容（原站是否有模式选择器）。
用法: python scripts/recon_home_addmenu.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        before = await pg.evaluate("()=>document.body.innerText.replace(/\\s+/g,' ').length")
        await pg.locator(".composer-add-button").first.click()
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""()=>{
          const all=Array.from(document.querySelectorAll('body *'));
          const pop = all.filter(e=>{
            const cs=getComputedStyle(e);
            const b=e.getBoundingClientRect();
            return (cs.position==='fixed'||cs.position==='absolute') && b.width>60 && b.height>30 && b.top<700;
          }).slice(-14).map(e=>[(e.className||'').toString().slice(0,60), Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().y), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height), (e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,40)]);
          return {pop, text: document.body.innerText.replace(/\\s+/g,' ').slice(0,600)};
        }""")
        for k, v in r.items():
            print(k, ":", v)
        await b.close()

asyncio.run(main())

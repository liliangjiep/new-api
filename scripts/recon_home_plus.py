# -*- coding: utf-8 -*-
"""原站首页 composer 细节：加号按钮行为、模式选择器是否存在、上传相关元素。
用法: python scripts/recon_home_plus.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const all = Array.from(document.querySelectorAll('*'));
  const hit = (re) => all.filter(e => {
    const c = (e.className||'').toString();
    return typeof c === 'string' && re.test(c);
  }).map(e => {
    const b = e.getBoundingClientRect();
    return [(e.className||'').toString().slice(0,60), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
  });
  const add = document.querySelector('.composer-add-button');
  const ab = add ? add.getBoundingClientRect() : null;
  const modeTexts = Array.from(document.querySelectorAll('button,div,span'))
    .filter(e => (e.innerText||'').trim().length <= 12 && /Agent|模式|智能/.test(e.innerText||''))
    .map(e => [(e.className||'').toString().slice(0,50), (e.innerText||'').trim()]);
  return {
    reference: hit(/reference|upload|attach/).slice(0, 12),
    mode: hit(/mode|dropdown|style-select/).slice(0, 12),
    addButton: ab && [Math.round(ab.x), Math.round(ab.y), Math.round(ab.width), Math.round(ab.height)],
    addButtonHTML: add ? add.outerHTML.slice(0, 400) : null,
    modeTexts: modeTexts.slice(0, 10),
    fullText: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0, 400),
  };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        r = await pg.evaluate(JS)
        for k, v in r.items():
            print(k, ":", v)
        await b.close()

asyncio.run(main())

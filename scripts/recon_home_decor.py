# -*- coding: utf-8 -*-
"""抓原站首页 home-decoration-* 装饰层完整 class 与结构。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = {};
  out['__decor'] = Array.from(document.querySelectorAll('[class*=home-decoration], [class*=home-account-actions]')).map(e => ({
    tag: e.tagName.toLowerCase(),
    cls: e.className,
    parent: e.parentElement ? e.parentElement.className : null,
    childCount: e.children.length,
    inner: (e.innerHTML||'').slice(0, 400),
  }));
  const pw = document.querySelector('.page-home');
  out['__pw_parent'] = pw.parentElement.className;
  out['__pw_parent_html'] = pw.parentElement.outerHTML.slice(0, 1500);
  return out;
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = await ctx.new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        r = await pg.evaluate(JS)
        print("pw_parent:", r["__pw_parent"])
        print("--- decor ---")
        for d in r["__decor"]:
            print(json.dumps(d, ensure_ascii=False)[:900])
            print()
        await b.close()

asyncio.run(main())

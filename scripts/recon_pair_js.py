# -*- coding: utf-8 -*-
"""定点对比：给定路由 + JS 探针，原站 vs 本地。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"


async def grab(ctx, base, path, js, wait=6000):
    page = await ctx.new_page()
    try:
        await page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(wait)
        return await page.evaluate(js)
    except Exception as e:
        return {"err": str(e)[:200]}
    finally:
        await page.close()


async def main():
    path = sys.argv[1]
    jsfile = sys.argv[2]
    js = open(jsfile, encoding="utf-8").read()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        octx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        lctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        o, l = await asyncio.gather(grab(octx, ORIG, path, js), grab(lctx, LOCAL, path, js))
        print("=== ORIG ===")
        print(json.dumps(o, ensure_ascii=False, indent=1))
        print("=== OURS ===")
        print(json.dumps(l, ensure_ascii=False, indent=1))
        await br.close()

asyncio.run(main())

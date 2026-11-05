# -*- coding: utf-8 -*-
"""轮询本地页面 pinned-nav / 栅格 随时间变化（定位闪动/收敛问题）。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

LOCAL = "http://localhost:3000"

async def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/toolbox/image-generation"
    js = open(sys.argv[2], encoding="utf-8").read()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = await ctx.new_page()
        await page.goto(LOCAL + path, wait_until="domcontentloaded", timeout=40000)
        res = await page.evaluate(js)
        print(json.dumps(res, ensure_ascii=False, indent=1))
        await br.close()

asyncio.run(main())

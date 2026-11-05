# -*- coding: utf-8 -*-
"""检查历史差异清单里剩余的 P1/P2 项是否仍然存在。
用法: python scripts/recon_open_items.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

CHECKS = {
    "/toolbox/depth-video-clone": [
        (".feature-guide-popover", "P1-1 引导浮层"),
        (".generation-skill-panel", "P1-1 复刻方式面板"),
        (".generation-skill-card-select", "P1-1 复刻方式卡片"),
    ],
    "/toolbox/video-watermark-remove": [
        ("section[aria-label='水印区']", "P1-2 多余水印区"),
        (".backdrop-blur-lg", "P1-3 backdrop-blur-lg 容器"),
    ],
    "/toolbox/video-quality-enhance": [
        (".backdrop-blur-lg", "P1-3 backdrop-blur-lg 容器"),
    ],
    "/toolbox/video-subtitle-erase": [
        (".backdrop-blur-lg", "P1-3 backdrop-blur-lg 容器"),
    ],
    "/": [
        (".home-entry-scene-card", "首页场景卡"),
        (".ui-waterfall-item", "首页瀑布流"),
    ],
}

JS = """(sels) => {
  const out = {};
  for (const s of sels) {
    const els = Array.from(document.querySelectorAll(s));
    out[s] = els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; });
  }
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path, sels in CHECKS.items():
            names = [s for s, _ in sels]
            for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
                pg = await ctx.new_page()
                await pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                await pg.wait_for_timeout(6000)
                res = await pg.evaluate(JS, names)
                print(f"{path} [{label}]")
                for s, desc in sels:
                    v = res.get(s) or []
                    print(f"   {desc:28s} {s[:42]:44s} {v[:3] if v else 'MISSING'}")
                await pg.close()
        await b.close()

asyncio.run(main())

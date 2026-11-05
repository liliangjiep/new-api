# -*- coding: utf-8 -*-
"""全路由 DOM 结构对齐：原站 vs 本地，按 (depth, tag, class首段) 序列比对，报告 MISSING/EXTRA。"""
import asyncio, sys, difflib
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = [];
  const walk = (el, d) => {
    for (const c of el.children) {
      if (d > 6) continue;
      const cls = (c.className && c.className.baseVal !== undefined)
        ? c.className.baseVal : (c.className || '');
      out.push(d + '|' + c.tagName.toLowerCase() + '|' + String(cls).split(' ').slice(0,2).join(' '));
      walk(c, d + 1);
    }
  };
  walk(document.body, 0);
  return out;
}"""

PAGES = [
    "/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
    "/toolbox/depth-video-clone", "/toolbox/digital-human",
    "/toolbox/ecommerce-image-set", "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
    "/canvas", "/assets", "/account", "/agent-cloud", "/agent-chat",
]


async def grab(ctx, base, path):
    pg = await ctx.new_page()
    try:
        await pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(5000)
        return await pg.evaluate(JS)
    except Exception as e:
        return ["ERR " + str(e)[:80]]
    finally:
        await pg.close()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in PAGES:
            o = await grab(ctx, "https://susu.da-ai.cc", path)
            l = await grab(ctx, "http://localhost:3000", path)
            sm = difflib.SequenceMatcher(None, o, l)
            ratio = sm.ratio()
            missing, extra = [], []
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag in ("delete", "replace"):
                    missing.extend(o[i1:i2])
                if tag in ("insert", "replace"):
                    extra.extend(l[j1:j2])
            print(f"=== {path}  sim={ratio:.3f}  missing={len(missing)} extra={len(extra)}")
            for m in missing[:12]:
                print("   - " + m)
            for e in extra[:12]:
                print("   + " + e)
        await b.close()

asyncio.run(main())

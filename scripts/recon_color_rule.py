# -*- coding: utf-8 -*-
"""用 CDP 查原站 .home-discover-content 的 color 是被哪条 CSS 规则设置的。
用法: python scripts/recon_color_rule.py
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
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send("DOM.enable")
        await cdp.send("CSS.enable")
        doc = await cdp.send("DOM.getDocument")
        node = await cdp.send("DOM.querySelector", {"nodeId": doc["root"]["nodeId"], "selector": ".home-discover-content"})
        res = await cdp.send("CSS.getMatchedStylesForNode", {"nodeId": node["nodeId"]})
        for m in res["matchedCSSRules"]:
            rule = m["rule"]
            for prop in rule["style"].get("cssProperties", []):
                if prop["name"] in ("color", "opacity", "fill"):
                    print(rule["selectorList"]["text"], "=>", prop["name"], ":", prop["value"])
        await b.close()

asyncio.run(main())

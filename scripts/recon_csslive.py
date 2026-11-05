# -*- coding: utf-8 -*-
"""实时检查本地页面某选择器的计算样式 + 命中的 CSS 规则来源。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

LOCAL = "http://localhost:3000"

JS = """(sels) => {
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el);
    out[s] = {
      cls: el.className.toString().slice(0, 300),
      bc: cs.borderColor, bw: cs.borderWidth, bs: cs.borderStyle,
      bg: cs.backgroundColor, color: cs.color,
      fs: cs.fontSize, br: cs.borderRadius, pad: cs.padding,
    };
  }
  // 找出哪些规则设置了 border-color
  const rules = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list;
    try { list = sheet.cssRules; } catch(e) { continue; }
    for (const r of Array.from(list)) {
      if (r.style && r.style.borderColor && r.selectorText) {
        rules.push(r.selectorText + ' => ' + r.style.borderColor);
      }
      if (r.cssRules) {
        for (const r2 of Array.from(r.cssRules)) {
          if (r2.style && r2.style.borderColor && r2.selectorText) {
            rules.push(r2.selectorText + ' => ' + r2.style.borderColor);
          }
        }
      }
    }
  }
  out.__rules = rules.slice(0, 60);
  return out;
}"""

async def main():
    path = sys.argv[1] if len.argv) > 1 else "/toolbox/image-generation"
    sels = sys.argv[2:] or [
        ".toolbox-editor-panel-root", ".toolbox-preview-panel", ".ui-button",
        ".toolbox-selector-trigger", ".card", "body",
    ]
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = await ctx.new_page()
        await page.goto(LOCAL + path, wait_until="domcontentloaded", timeout=40000)
        await page.wait_for_timeout(5000)
        res = await page.evaluate(JS, sels)
        print(json.dumps(res, ensure_ascii=False, indent=1))
        await br.close()

asyncio.run(main())

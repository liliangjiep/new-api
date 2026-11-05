# -*- coding: utf-8 -*-
"""实时查某元素 border-color 的来源规则（含 layer 信息）。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return {err: 'not found'};
  const cs = getComputedStyle(el);
  const out = {cls: el.className.toString().slice(0,400),
               bc: cs.borderColor, bw: cs.borderWidth, color: cs.color};
  const hits = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch(e) { continue; }
    const walk = (list, layerName) => {
      for (const r of Array.from(list)) {
        if (r.cssRules && (r.conditionText !== undefined || r.constructor.name === 'CSSLayerBlockRule')) {
          let ln = layerName;
          if (r.constructor.name === 'CSSLayerBlockRule') ln = r.name;
          walk(r.cssRules, ln);
          continue;
        }
        if (!r.selectorText || !r.style) continue;
        const bc = r.style.borderColor || (r.style.border && r.style.border.includes('solid') ? 'shorthand' : '');
        if (!bc) continue;
        try {
          if (el.matches(r.selectorText)) {
            hits.push({sel: r.selectorText, borderColor: bc, layer: ln,
                       order: hits.length});
          }
        } catch(e) {}
      }
    };
    walk(rules, null);
  }
  out.hits = hits;
  return out;
}"""

async def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/toolbox/image-generation"
    sel = sys.argv[2] if len(sys.argv) > 2 else ".toolbox-editor-panel-root"
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = await ctx.new_page()
        await page.goto(LOCAL + path, wait_until="domcontentloaded", timeout=40000)
        await page.wait_for_timeout(6000)
        print(json.dumps(await page.evaluate(JS, sel), ensure_ascii=False, indent=1))
        await br.close()

asyncio.run(main())

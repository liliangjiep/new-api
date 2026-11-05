# -*- coding: utf-8 -*-
"""直接在浏览器里查 border-color 规则来源（用 CSSStyleSheet 全文匹配）。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

LOCAL = "http://localhost:3000"

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return {err:'not found'};
  const cs = getComputedStyle(el);
  const found = [];
  const all = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let txt = '';
    try { txt = Array.from(sheet.cssRules).map(r => r.cssText).join('\\n'); } catch(e) { continue; }
    if (/border-color/.test(txt) && /e5e7eb/.test(txt)) {
      // 找出含 e5e7eb 的规则片段
      const m = txt.match(/[^}]*e5e7eb[^}]*}/g);
      if (m) found.push(...m.map(x => x.slice(0, 200)));
    }
    all.push({href: sheet.href, len: txt.length});
  }
  // 手动测试：给元素加 border-color 看结果
  const test = document.createElement('div');
  test.style.borderColor = 'rgb(229,231,235)';
  const probe = document.createElement('div');
  probe.id = 'probe-bc';
  probe.className = 'border';
  document.body.appendChild(probe);
  const probeBC = getComputedStyle(probe).borderColor;
  probe.remove();
  return {bc: cs.borderColor, bw: cs.borderWidth,
          probeBC, found: found.slice(0,10), sheets: all};
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

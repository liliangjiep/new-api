# -*- coding: utf-8 -*-
"""取原站首页 composer 相关 root 变量 + 关键元素计算样式。
用法: python scripts/recon_home_vars.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const root = getComputedStyle(document.documentElement);
  const names = ['--home-composer-editor-height','--home-composer-input-min-height','--toolbar-size',
                 '--toolbar-font-size','--toolbar-icon-size','--home-discover-margin'];
  const vars = {};
  for (const n of names) vars[n] = root.getPropertyValue(n).trim();
  const g = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const o = {cls: (el.className||'').toString().slice(0,90)};
    for (const p of props) o[p] = cs.getPropertyValue(p).trim();
    const b = el.getBoundingClientRect();
    o._rect = [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    return o;
  };
  return {
    vars,
    wrap: g('.home-header-composer-wrap', ['padding','border','border-radius','background-color','box-shadow','gap']),
    content: g('.home-composer-content', ['padding','gap','display','flex-direction']),
    editor: g('.home-composer-editor', ['height','min-height','overflow','padding','display','flex-direction']),
    viewport: g('.home-composer-input-viewport', ['height','display']),
    toolbarWrap: g('.home-composer-toolbar-wrap', ['margin-top','padding','height']),
    toolbar: g('.composer-toolbar', ['height','padding']),
    addBtn: g('.composer-add-button', ['width','height','border-radius','background-color','color','padding']),
    placeholder: g('.mention-composer-placeholder', ['font-size','line-height','color','left','top','right']),
    editorInner: g('.mention-composer-editor', ['font-size','line-height','padding','color']),
    shell: g('.mention-composer-shell', ['min-height','max-height','border-radius','padding']),
  };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")).new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        r = await pg.evaluate(JS)
        for k, v in r.items():
            print(k, ":", v)
        await b.close()

asyncio.run(main())

# -*- coding: utf-8 -*-
"""首页 composer 差异定位：原站是否有 reference rail / mode selector / add button。
用法: python scripts/recon_home_diff_detail.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const q = (s) => document.querySelectorAll(s).length;
  const add = document.querySelector('.composer-add-button');
  const comb = Array.from(document.querySelectorAll('[role=combobox]')).map(e => {
    const b = e.getBoundingClientRect();
    return [(e.className||'').toString().slice(0,60), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), (e.innerText||'').trim().slice(0,16)];
  });
  const rail = document.querySelector('.composer-reference-rail-desktop');
  const rr = rail ? rail.getBoundingClientRect() : null;
  const upload = document.querySelector('.composer-reference-upload-button');
  const ur = upload ? upload.getBoundingClientRect() : null;
  const editor = document.querySelector('.home-composer-editor');
  const er = editor ? editor.getBoundingClientRect() : null;
  const wrap = document.querySelector('.home-header-composer-wrap');
  const wr = wrap ? wrap.getBoundingClientRect() : null;
  const cs = wrap ? getComputedStyle(wrap) : null;
  return {
    counts: {
      referenceRail: q('.composer-reference-rail-desktop'), referenceUpload: q('.composer-reference-upload-button'),
      modeSelector: q('.home-mode-selector'), addButton: q('.composer-add-button'),
      styleDropdown: q('.home-style-dropdown'), combobox: q('[role=combobox]'),
      homeComposerContent: q('.home-composer-content'), homeComposerToolbarWrap: q('.home-composer-toolbar-wrap'),
      homeComposerInputRow: q('.home-composer-input-row'), homeComposerInputViewport: q('.home-composer-input-viewport'),
      homeComposerEditorWrap: q('.home-composer-editor-wrap'),
    },
    comboboxes: comb,
    rail: rr && [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)],
    upload: ur && [Math.round(ur.x), Math.round(ur.y), Math.round(ur.width), Math.round(ur.height)],
    editor: er && [Math.round(er.x), Math.round(er.y), Math.round(er.width), Math.round(er.height)],
    wrap: wr && [Math.round(wr.x), Math.round(wr.y), Math.round(wr.width), Math.round(wr.height)],
    wrapStyle: cs && {padding: cs.padding, border: cs.border, radius: cs.borderRadius, bg: cs.backgroundColor, gap: cs.gap},
  };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        for base in ["https://susu.da-ai.cc", "http://localhost:3000"]:
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            r = await pg.evaluate(JS)
            print("==", base)
            for k, v in r.items():
                print("  ", k, ":", v)
        await b.close()

asyncio.run(main())

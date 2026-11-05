# -*- coding: utf-8 -*-
"""检查本机是否有 DIN Alternate 字体，以及原站实际使用的字体。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const f = document.createElement('span');
  f.style.font = '20px "DIN Alternate"';
  f.textContent = '预计 -- 积分';
  document.body.appendChild(f);
  const w1 = f.getBoundingClientRect().width;
  f.style.font = '20px monospace';
  const w2 = f.getBoundingClientRect().width;
  f.style.font = '20px "Arial Narrow"';
  const w3 = f.getBoundingClientRect().width;
  f.remove();
  return {din: w1, mono: w2, narrow: w3, check: document.fonts.check('20px "DIN Alternate"')};
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
        ctx = br.new_context(viewport={"width":1600,"height":900})
        page = ctx.new_page()
        page.goto(base + "/toolbox/video-quality-enhance", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)
        print(name, page.evaluate(JS))
        page.close(); ctx.close()
    br.close()

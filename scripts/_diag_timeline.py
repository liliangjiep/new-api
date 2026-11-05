# -*- coding: utf-8 -*-
"""观察原站三栏栅格随时间的变化（导航面板展开/收起时机）。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  const nav = document.querySelector('.workspace-pinned-navigation');
  const e = document.querySelector('.toolbox-edit-region');
  return {
    cols: g ? getComputedStyle(g).gridTemplateColumns : null,
    navW: nav ? Math.round(nav.getBoundingClientRect().width) : null,
    navExpanded: nav ? nav.getAttribute('data-layout-expanded') : null,
    edit: e ? [Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().width)] : null,
    docW: document.documentElement.scrollWidth,
  };
}"""

URLS = [("orig", "https://susu.da-ai.cc/toolbox/video-generation"),
        ("ours", "http://localhost:3000/toolbox/video-generation")]

with sync_playwright() as p:
    br = p.chromium.launch()
    for tag, url in URLS:
        ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = ctx.new_page()
        pg.goto(url, wait_until="domcontentloaded", timeout=45000)
        prev = 0
        for t in (500, 1000, 2000, 4000, 7000):
            pg.wait_for_timeout(t - prev)
            prev = t
            print(tag, t, pg.evaluate(JS), flush=True)
        pg.close()
        ctx.close()
    br.close()

# -*- coding: utf-8 -*-
"""检查原站/本地三栏栅格 inline style 与队列栏状态。"""
import sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  const q = document.querySelector('.toolbox-queue-region');
  const e = document.querySelector('.toolbox-edit-region');
  return {
    gridStyle: g ? g.getAttribute('style') : null,
    gridCols: g ? getComputedStyle(g).gridTemplateColumns : null,
    htmlAttrs: Object.fromEntries(Object.entries(document.documentElement.attributes).map(([k,v])=>[k,v])),
    queueRect: q ? q.getBoundingClientRect().toJSON() : null,
    editRect: e ? e.getBoundingClientRect().toJSON() : null,
    bodyH: document.body.scrollHeight,
  };
}"""

URLS = [("orig", "https://susu.da-ai.cc/toolbox/video-generation"),
        ("ours", "http://localhost:3000/toolbox/video-generation")]

with sync_playwright() as p:
    br = p.chromium.launch()
    for tag, url in URLS:
        for attempt in range(2):
            ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
            pg = ctx.new_page()
            pg.goto(url, wait_until="domcontentloaded", timeout=45000)
            pg.wait_for_timeout(3000)
            print(tag, attempt, JS and pg.evaluate(JS), flush=True)
            pg.close(); ctx.close()
    br.close()

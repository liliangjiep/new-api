# -*- coding: utf-8 -*-
"""诊断：逐步计时，找出 probe 卡住的位置。"""
import time, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

URLS = [
    ("orig", "https://susu.da-ai.cc/toolbox/video-generation"),
    ("ours", "http://localhost:3000/toolbox/video-generation"),
]

with sync_playwright() as p:
    br = p.chromium.launch()
    for tag, url in URLS:
        ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = ctx.new_page()
        t = time.time()
        r = pg.goto(url, wait_until="domcontentloaded", timeout=45000)
        print(tag, "goto", round(time.time() - t, 1), r.status, flush=True)
        t = time.time()
        try:
            ok = pg.evaluate("() => !!document.querySelector('.genify-toolbox-3col')")
            print(tag, "eval", round(time.time() - t, 1), ok, flush=True)
        except Exception as e:
            print(tag, "eval err", round(time.time() - t, 1), e, flush=True)
        t = time.time()
        try:
            pg.wait_for_load_state("networkidle", timeout=8000)
            print(tag, "idle ok", round(time.time() - t, 1), flush=True)
        except Exception as e:
            print(tag, "idle err", round(time.time() - t, 1), type(e).__name__, flush=True)
        t = time.time()
        pg.wait_for_timeout(1200)
        print(tag, "wait", round(time.time() - t, 1), flush=True)
        t = time.time()
        d = pg.evaluate("() => ({n: document.querySelectorAll('.ui-button').length, h: document.body.scrollHeight})")
        print(tag, "probe", round(time.time() - t, 1), d, flush=True)
        pg.close()
        ctx.close()
    br.close()
print("ALL DONE", flush=True)

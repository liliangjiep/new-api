# -*- coding: utf-8 -*-
"""在本地页面上检查关键节点的类名与几何，便于与 .recon/orig 对照。
用法: python scripts/recon_inspect.py <base_url> <path> [selector ...]
"""
import json, sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sels = sys.argv[3:] or [
    ".workspace-shell",
    ".workspace-sidebar",
    ".workspace-main-shell",
    ".workspace-main-content",
    ".workspace-floating-navigation",
    ".workspace-navigation-title",
    ".workspace-navigation-scrollview",
    ".workspace-navigation-scrollbar",
    ".workspace-mobile-bottombar",
]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(3000)
    for sel in sels:
        info = page.evaluate(
            """(sel) => Array.from(document.querySelectorAll(sel)).map(el => {
                const r = el.getBoundingClientRect();
                const cs = getComputedStyle(el);
                return {cls: el.className, r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
                        d: cs.display, vis: cs.visibility, op: cs.opacity, pos: cs.position, z: cs.zIndex};
            })""",
            sel,
        )
        print("==", sel, len(info))
        for i in info:
            print("   ", json.dumps(i, ensure_ascii=False))
    ctx.close()
    b.close()

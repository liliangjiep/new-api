# -*- coding: utf-8 -*-
"""探查原站真实路由：访问后读取最终 URL / 标题，判断是否被重定向或 404。
用法: python scripts/recon_routes.py <base> [path ...]
"""
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
paths = sys.argv[2:] or [
    "/", "/login", "/register", "/admin", "/agent-chat", "/agent-cloud", "/canvas",
    "/assets", "/account", "/toolbox", "/discover", "/workbench", "/pricing", "/docs",
    "/tasks", "/toolbox/video-creator", "/toolbox/editor",
    "/toolbox/video-remix-viral", "/toolbox/stone-effect", "/toolbox/stone-materials",
    "/toolbox/video-generation", "/toolbox/image-generation",
    "/toolbox/ecommerce-image-set", "/toolbox/depth-video-clone",
    "/toolbox/digital-human", "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    for c in paths:
        try:
            r = page.goto(base + c, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(800)
            final = page.url
            print(f"{c:42s} status={r.status if r else '?'} final={final} title={page.title()!r}")
        except Exception as e:
            print(f"{c:42s} ERR {str(e)[:70]}")
    ctx.close()
    b.close()

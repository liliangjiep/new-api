# -*- coding: utf-8 -*-
"""一次性抓取原站发现流：DOM 内容 + 几何（同一次会话，保证顺序一致）。"""
import json, re, sys, io
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "https://susu.da-ai.cc"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(6000)
    # 滚动到底触发懒加载
    for _ in range(8):
        page.mouse.wheel(0, 3000)
        page.wait_for_timeout(700)
    page.wait_for_timeout(2000)
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(500)

    data = page.evaluate(
        """() => {
      const root = document.querySelector('.home-discover-waterfall');
      if (!root) return null;
      const items = Array.from(root.children).map(el => {
        const r = el.getBoundingClientRect();
        const t = el.querySelector('.font-semibold');
        const d = el.querySelector('span.font-normal');
        const likes = el.querySelector('button[aria-label="点赞"]');
        const icon = el.querySelector('.discover-card-type-icon');
        const style = el.getAttribute('style') || '';
        return {
          rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          style,
          title: t ? t.textContent : '',
          desc: d ? d.textContent : '',
          likes: likes ? likes.textContent.trim() : '',
          icon: icon ? icon.innerHTML : '',
          videoCover: !!el.querySelector('.discover-card-video-cover'),
          html: el.outerHTML,
        };
      });
      return { total: root.getAttribute('style'), items };
    }"""
    )
    ctx.close()
    b.close()

json.dump(data, open(".recon/static/home_discover_live.json", "w", encoding="utf-8"), ensure_ascii=False)
print("items", len(data["items"]))

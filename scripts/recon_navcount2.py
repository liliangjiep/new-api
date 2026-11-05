# -*- coding: utf-8 -*-
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1]
paths = sys.argv[2:]

JS = """() => {
  const fl = Array.from(document.querySelectorAll('.workspace-floating-navigation')).map(e => {
    const t = e.querySelector('.workspace-navigation-title');
    return t ? t.textContent.trim() : '?';
  });
  const pin = Array.from(document.querySelectorAll('.workspace-pinned-navigation')).map(e => {
    const t = e.querySelector('.workspace-navigation-title');
    return t ? t.textContent.trim() : '?';
  });
  const rail = Array.from(document.querySelectorAll('.workspace-sidebar-item')).map(e => e.getAttribute('aria-label'));
  const main = document.querySelector('.workspace-main-content');
  return {
    floating: fl,
    pinned: pin,
    rail,
    mainFirst: main && main.firstElementChild ? {
      tag: main.firstElementChild.tagName,
      cls: (main.firstElementChild.getAttribute('class')||'').slice(0,160),
    } : null,
    mainRect: main ? [main.getBoundingClientRect().x, main.getBoundingClientRect().y, main.getBoundingClientRect().width, main.getBoundingClientRect().height] : null,
    shellRect: (()=>{const s=document.querySelector('.workspace-shell'); const r=s.getBoundingClientRect(); return [r.x,r.y,r.width,r.height];})(),
  };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    for path in paths:
        try:
            page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            d = page.evaluate(JS)
            print(path, json.dumps(d, ensure_ascii=False))
        except Exception as e:
            print(path, "ERR", str(e)[:120])
    ctx.close()
    b.close()

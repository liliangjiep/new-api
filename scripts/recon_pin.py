# -*- coding: utf-8 -*-
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1]
paths = sys.argv[2:]

JS = """() => {
  const pin = Array.from(document.querySelectorAll('.workspace-pinned-navigation')).map(e => {
    const t = e.querySelector('.workspace-navigation-title');
    return t ? t.textContent.trim() : '?';
  });
  const fl = Array.from(document.querySelectorAll('.workspace-floating-navigation')).map(e => {
    const t = e.querySelector('.workspace-navigation-title');
    return t ? t.textContent.trim() : '?';
  });
  const main = document.querySelector('.workspace-main-content');
  return { pinned: pin, floating: fl,
    mainFirst: main && main.firstElementChild ? (main.firstElementChild.getAttribute('class')||'').slice(0,90) : null,
    h2: Array.from(document.querySelectorAll('main h2')).map(e=>e.textContent.trim().slice(0,20)).slice(0,12),
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
            print(path, json.dumps(page.evaluate(JS), ensure_ascii=False))
        except Exception as e:
            print(path, "ERR", str(e)[:100])
    ctx.close()
    b.close()

# -*- coding: utf-8 -*-
"""导出原站关键节点的完整 class 字符串与 pinned nav 逻辑。"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"

JS = """
() => {
  const t = document.querySelector('.genify-toolbox-3col');
  const shell = document.querySelector('.workspace-main-shell');
  const content = document.querySelector('.workspace-main-content');
  const layout = t.closest('.toolbox-workspace-layout');
  const section = t.parentElement;
  const pin = document.querySelector('.workspace-pinned-navigation');
  const floats = [...document.querySelectorAll('.workspace-floating-navigation')];
  const html = document.documentElement;
  return {
    win: innerWidth,
    htmlAttrs: [...html.attributes].map(a => [a.name, a.value]),
    gridCls: t.getAttribute('class'),
    gridStyle: t.getAttribute('style'),
    sectionCls: section.getAttribute('class'),
    layoutCls: layout.getAttribute('class'),
    contentCls: content.getAttribute('class'),
    shellCls: shell.getAttribute('class'),
    shellChildren: [...shell.children].map(c => c.tagName.toLowerCase()+'.'+c.className.split(' ').slice(0,2).join('.')),
    pinExists: !!pin,
    pinCls: pin ? pin.getAttribute('class') : null,
    pinStyle: pin ? pin.getAttribute('style') : null,
    pinAttrs: pin ? [...pin.attributes].map(a=>[a.name,a.value]) : null,
    pinChildren: pin ? [...pin.children].map(c=>c.tagName.toLowerCase()+'.'+c.className) : null,
    floats: floats.map(f => ({cls: f.getAttribute('class'), style: f.getAttribute('style'), w: f.getBoundingClientRect().width, x: f.getBoundingClientRect().x})),
    sidebarChildren: [...document.querySelector('.workspace-sidebar').children].map(c=>c.tagName.toLowerCase()+'.'+c.className),
  };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1440, 1600):
        ctx = b.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        d = page.evaluate(JS)
        print(f"########## {w} ##########")
        print(json.dumps(d, ensure_ascii=False, indent=1))
        ctx.close()
    b.close()

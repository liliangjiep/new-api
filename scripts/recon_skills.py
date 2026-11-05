# -*- coding: utf-8 -*-
"""提取原站 pinned nav 的分类 + 技能清单。"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")

JS = """
() => {
  const pin = document.querySelector('.workspace-pinned-navigation');
  if (!pin) return null;
  const title = pin.querySelector('.workspace-navigation-title')?.textContent?.trim();
  const sections = [];
  for (const sec of pin.querySelectorAll('.workspace-navigation-section')) {
    const name = sec.querySelector('.workspace-navigation-section-title')?.textContent?.trim();
    const items = [];
    for (const it of sec.querySelectorAll('.navigation-section-item')) {
      const a = it.querySelector('a.option-item-action');
      const t = it.querySelector('.generation-skills-navigation-list-title')?.textContent?.trim();
      const d = it.querySelector('.generation-skills-navigation-list-description')?.textContent?.trim();
      const img = it.querySelector('img.generation-skills-navigation-list-thumbnail')?.getAttribute('src');
      if (a && t) items.push({ title: t, desc: d || '', href: a.getAttribute('href'), img });
    }
    sections.push({ name, items });
  }
  return { id: pin.id, title, sections };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for path in sys.argv[2:]:
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        d = page.evaluate(JS)
        print(f"===== {path} =====")
        print(json.dumps(d, ensure_ascii=False, indent=1))
        ctx.close()
    b.close()

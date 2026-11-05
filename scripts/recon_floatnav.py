# -*- coding: utf-8 -*-
"""抓取原站悬浮导航（workspace-floating-navigation）的运行时样式。
用法: python scripts/recon_floatnav.py <base_url> [path]
"""
import json, sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/"

JS = """
() => {
  const pick = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: el.className,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      transform: cs.transform,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      position: cs.position,
      top: cs.top, left: cs.left, right: cs.right, bottom: cs.bottom,
      zIndex: cs.zIndex, visibility: cs.visibility, display: cs.display,
      width: cs.width, height: cs.height, padding: cs.padding, margin: cs.margin,
      background: cs.backgroundColor, borderRadius: cs.borderRadius,
      transition: cs.transitionProperty,
      overflow: cs.overflow,
    };
  };
  const out = { floats: [], html: {} };
  document.querySelectorAll('.workspace-floating-navigation').forEach(el => {
    out.floats.push(pick(el));
    const t = el.querySelector('.workspace-floating-navigation-surface');
    if (t) out.floats.push(pick(t));
  });
  const shell = document.querySelector('.workspace-shell');
  if (shell) out.html.shell = pick(shell);
  const mainShell = document.querySelector('.workspace-main-shell');
  if (mainShell) out.html.mainShell = pick(mainShell);
  const rail = document.querySelector('.workspace-sidebar');
  if (rail) out.html.rail = pick(rail);
  const op = document.querySelector('.workspace-main-content');
  if (op) out.html.mainContent = pick(op);
  out.html.rootVars = {};
  const rs = getComputedStyle(document.documentElement);
  for (const v of ['--global-operation-notice-height','--global-open-panel-height','--container-shell','--toolbar-size','--color-line','--color-home-page-bg']) {
    out.html.rootVars[v] = rs.getPropertyValue(v).trim();
  }
  const body = getComputedStyle(document.body);
  out.html.body = { margin: body.margin, height: body.height, overflow: body.overflow, background: body.backgroundColor };
  return out;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    data = page.evaluate(JS)
    print(json.dumps(data, ensure_ascii=False, indent=1))
    ctx.close()
    b.close()

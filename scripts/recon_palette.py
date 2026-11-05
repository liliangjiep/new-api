# -*- coding: utf-8 -*-
"""测量原站关键元素计算颜色 + 根 token。"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"

JS = """
() => {
  const out = {};
  const cs = getComputedStyle(document.documentElement);
  const rootVars = {};
  for (const sh of cs) if (sh.startsWith('--color-') || sh.startsWith('--radius')) rootVars[sh] = cs.getPropertyValue(sh).trim();
  out.rootVars = rootVars;
  const pick = (sel, label) => {
    const el = document.querySelector(sel);
    if (!el) { out[label] = null; return; }
    const c = getComputedStyle(el);
    out[label] = { bg: c.backgroundColor, color: c.color, border: c.borderColor, radius: c.borderRadius, font: c.fontSize+'/'+c.lineHeight };
  };
  pick('body', 'body');
  pick('.workspace-shell', 'shell');
  pick('.workspace-main-shell', 'mainShell');
  pick('.workspace-sidebar', 'sidebar');
  pick('.workspace-pinned-navigation-surface', 'pinnedSurface');
  pick('.toolbox-editor-panel-root', 'editorCard');
  pick('.prompt-composer-root', 'composer');
  pick('.toolbox-preview-panel', 'previewPanel');
  pick('.toolbox-queue-expanded-desktop > div', 'queueCard');
  pick('.toolbox-selector-trigger', 'selectorTrigger');
  pick('.ui-button-primary', 'primaryBtn');
  pick('.generation-submit-label', 'submitLabel');
  pick('.generation-submit-credit', 'submitCredit');
  pick('.workspace-navigation-title', 'navTitle');
  pick('.workspace-navigation-section-label', 'navSection');
  pick('.generation-skills-navigation-list-title', 'navItem');
  pick('.workspace-sidebar-item', 'sidebarItem');
  pick('.option-item-action', 'optionAction');
  pick('.toolbox-preview-tab', 'previewTab');
  pick('.reference-slot-trigger', 'slotTrigger');
  pick('.reference-slot-title', 'slotTitle');
  return out;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)
    d = page.evaluate(JS)
    print(json.dumps(d, ensure_ascii=False, indent=1))
    ctx.close(); b.close()

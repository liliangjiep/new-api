# -*- coding: utf-8 -*-
"""对比 hot-video-remix 面板关键节点完整 class。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const root = document.querySelector('.toolbox-editor-panel-root');
  const out = [];
  const walk = (e, d) => {
    if (d > 4) return;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    out.push({
      d, tag: e.tagName.toLowerCase(),
      cls: typeof e.className === 'string' ? e.className : '',
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      display: cs.display, flex: cs.flex, flexDir: cs.flexDirection, gap: cs.gap,
      position: cs.position, bottom: cs.bottom, overflowY: cs.overflowY,
    });
    for (const c of e.children) walk(c, d + 1);
  };
  walk(root, 0);
  return out;
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + "/toolbox/hot-video-remix", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"===== {name} =====")
            for it in page.evaluate(JS):
                print("  ", it["d"], it["tag"], "|", it["cls"][:230])
                print("      ", it["rect"], "disp=", it["display"], "flex=", it["flex"], "dir=", it["flexDir"], "gap=", it["gap"], "pos=", it["position"], "ovY=", it["overflowY"])
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

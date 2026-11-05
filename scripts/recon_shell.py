# -*- coding: utf-8 -*-
"""深挖 prompt-editor-shell / bottom-action 的布局关系。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const sels = ['.prompt-composer-root', '.prompt-editor-shell', '.prompt-editor-viewport',
                '.prompt-reference-bottom-action', '.prompt-reference-uploader'];
  const out = {};
  for (const s of sels) {
    const e = document.querySelector(s);
    if (!e) { out[s] = null; continue; }
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    out[s] = {
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      display: cs.display, flex: cs.flex, flexBasis: cs.flexBasis, flexGrow: cs.flexGrow,
      flexShrink: cs.flexShrink, height: cs.height, minH: cs.minHeight, maxH: cs.maxHeight,
      position: cs.position, overflow: cs.overflow, pad: cs.padding, pb: cs.paddingBottom,
      box: cs.boxSizing, alignSelf: cs.alignSelf, offsetParent: e.offsetParent ? (e.offsetParent.className||e.offsetParent.tagName) : null,
      offsetTop: e.offsetTop, offsetH: e.offsetHeight,
    };
  }
  const root = document.querySelector('.prompt-composer-root');
  out.__children = Array.from(root.children).map(c => c.className.split(/\\s+/).slice(0,2).join('.') + ':' + Math.round(c.getBoundingClientRect().y) + ',' + Math.round(c.getBoundingClientRect().height) + ' offTop=' + c.offsetTop);
  return out;
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + "/toolbox/image-generation", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"===== {name} =====")
            for k, v in page.evaluate(JS).items():
                print("  ", k, v)
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

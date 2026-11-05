# -*- coding: utf-8 -*-
"""抓取某个容器内的 DOM 轮廓（tag + 语义 class + aria-label + rect + 文本），
原站 vs 本地对比。

用法: python scripts/recon_domtree.py <orig|ours> <path> <container-selector> <out.json>
"""
import json, os, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

JS = """(sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const KEEP = /^[a-z]+(-[a-z0-9]+)+$/;
  const SKIP = /^(text|bg|p|px|py|m|mx|my|gap|w|h|min|max|flex|grid|rounded|border|transition|duration|shadow|ring|outline|top|left|right|bottom|z|inset|space|order|col|row|items|justify|self|overflow|truncate|whitespace|font|leading|tracking|opacity|pointer|select|resize|list|appearance|absolute|relative|fixed|sticky|block|inline|hidden|group|hover|focus|disabled|backdrop|object|cursor|backdrop)-/;
  const norm = (cls) => {
    if (typeof cls !== 'string') return '';
    return [...new Set(cls.split(/\\s+/).filter(c => KEEP.test(c) && !SKIP.test(c)))].join(' ');
  };
  const walk = (el, d) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const o = {
      d, t: el.tagName.toLowerCase(), c: norm(el.className),
      al: el.getAttribute('aria-label') || undefined,
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      disp: cs.display, pad: cs.padding, mar: cs.margin, gap: cs.gap,
      flex: cs.flex, minh: cs.minHeight, ov: cs.overflow, h: cs.height,
      bg: cs.backgroundColor, bc: cs.borderColor, br: cs.borderRadius,
      fs: cs.fontSize, fw: cs.fontWeight,
      txt: own.slice(0, 70) || undefined,
    };
    o.k = Array.from(el.children).map(c => walk(c, d + 1));
    return o;
  };
  return walk(root, 0);
}"""


def main():
    which, path, sel, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    base = ORIG if which == "orig" else LOCAL
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        time.sleep(4)
        data = page.evaluate(JS, sel)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print("saved", out)
        ctx.close()
        br.close()


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""对比原站与我方的关键计算样式（颜色/尺寸）。
用法: python scripts/recon_style_diff.py <origbase> <oursbase> <path ...>
"""
import sys, json
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}

PROBES = [
    ("body", None),
    ("main.workspace-main-content", None),
    ("div.toolbox-editor-panel-root", None),
    ("div.prompt-composer-root", None),
    ("button.ui-button-primary", None),
    ("button.toolbox-selector-trigger", None),
    ("aside.workspace-sidebar", None),
    ("aside.workspace-pinned-navigation", None),
    ("div.workspace-navigation-title", None),
    ("a.workspace-sidebar-item", None),
    ("div.toolbox-preview-tab", None),
    ("section", "参数"),
]


def probe(page):
    return page.evaluate(
        """() => {
      const pick = (el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          bg: cs.backgroundColor, color: cs.color, br: cs.borderRadius,
          fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
          bb: cs.borderBottom, bbw: cs.borderBottomWidth,
          pad: cs.padding, h: Math.round(r.width)+'x'+Math.round(r.height),
          sh: cs.boxShadow.slice(0,60),
        };
      };
      const out = [];
      const sels = %s;
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) out.push([s, pick(el)]);
      }
      return out;
    }"""
        % json.dumps([p[0] for p in PROBES])
    )


def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or [
        "/toolbox/image-generation", "/toolbox/video-generation",
        "/toolbox/ecommerce-image-set", "/toolbox/digital-human",
    ]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            res = {}
            for tag, base in (("O", ob), ("X", ub)):
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
                    page.wait_for_timeout(3000)
                    res[tag] = {k: v for k, v in probe(page)}
                except Exception as e:
                    res[tag] = {"ERR": str(e)[:60]}
            page.close()
            print(f"\n===== {path} =====")
            keys = set(res["O"]) | set(res["X"])
            for k in sorted(keys):
                o = res["O"].get(k, {})
                u = res["X"].get(k, {})
                if o == u:
                    continue
                print(f"  {k}")
                for f in ("bg", "color", "br", "fs", "fw", "h", "pad", "bbw"):
                    if o.get(f) != u.get(f):
                        print(f"     {f}: orig={o.get(f)!r} ours={u.get(f)!r}")
        ctx.close()
        b.close()


if __name__ == "__main__":
    main()

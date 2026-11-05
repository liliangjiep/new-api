# -*- coding: utf-8 -*-
"""对比两站指定选择器的 computed style。"""
import json
import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROPS = [
    "display",
    "width",
    "height",
    "min-height",
    "flex",
    "flex-direction",
    "grid-template-columns",
    "gap",
    "padding",
    "margin",
    "background-color",
    "color",
    "font-size",
    "line-height",
    "font-weight",
    "font-family",
    "border-radius",
    "border",
    "box-shadow",
    "position",
    "top",
    "left",
    "right",
    "bottom",
    "z-index",
    "overflow",
    "overflow-x",
    "overflow-y",
    "opacity",
    "transform",
    "transition",
    "aspect-ratio",
    "text-align",
    "letter-spacing",
    "white-space",
    "object-fit",
    "max-width",
    "min-width",
    "max-height",
]


def grab(page, base, path, sel):
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    return page.evaluate(
        """(sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const o = {__rect: [r.x, r.y, r.width, r.height], __cls: el.className};
            for (const p of %s) o[p] = cs.getPropertyValue(p);
            return o;
        }"""
        % json.dumps(PROPS),
        sel,
    )


def main(orig, local, path, sels):
    with sync_playwright() as p:
        b = p.chromium.launch()
        co = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        cl = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        po, pl = co.new_page(), cl.new_page()
        for sel in sels:
            a = grab(po, orig, path, sel)
            c = grab(pl, local, path, sel)
            print("=" * 70)
            print("SEL:", sel)
            if not a:
                print("  ORIG: NOT FOUND")
            if not c:
                print("  LOCAL: NOT FOUND")
            if a and c:
                print(f"  rect ORIG={a['__rect']}  LOCAL={c['__rect']}")
                diffs = []
                for k in PROPS:
                    if a.get(k) != c.get(k):
                        diffs.append(f"{k}: {a.get(k)!r} vs {c.get(k)!r}")
                if not diffs:
                    print("  ✓ all computed styles identical")
                else:
                    for d in diffs:
                        print("  ✗", d)
        co.close()
        cl.close()
        b.close()


if __name__ == "__main__":
    main(
        sys.argv[1],
        sys.argv[2],
        sys.argv[3],
        sys.argv[4:],
    )

# -*- coding: utf-8 -*-
"""在原站 CSS bundle 中查找若干选择器的位置（判断层叠顺序）与规则内容。
用法: python scripts/recon_css_order.py <sel1> [sel2 ...]
"""
import sys, os, re, glob

D = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".recon", "static"))
files = sorted(glob.glob(os.path.join(D, "*.css")))

blob = []
for f in files:
    with open(f, encoding="utf-8", errors="ignore") as fh:
        blob.append((os.path.basename(f), fh.read()))

for target in sys.argv[1:]:
    pat = re.compile(r"(?<![\w-])\." + re.escape(target) + r"(?![\w-])")
    hits = []
    for name, css in blob:
        for m in pat.finditer(css):
            # 取该选择器所在规则的 body
            start = css.rfind("{", 0, m.start())
            end = css.find("}", m.start())
            sel = css[max(0, m.start() - 60):m.start()]
            hits.append((name, m.start(), sel, css[m.start():end + 1][:200]))
    print(f"\n########## .{target}  hits={len(hits)}")
    for name, pos, sel, body in sorted(hits, key=lambda x: x[1]):
        print(f"  [{name} @{pos}] ...{sel[-50:]} {body}")

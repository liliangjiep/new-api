# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
h = open(f, encoding="utf-8", errors="replace").read()
for m in re.finditer(r'<button type="button"[^>]*class="toolbox-selector-trigger[^"]*"', h):
    seg = h[m.start():m.start()+1600]
    e = seg.find("</button>")
    seg = seg[:e]
    chev = "ABS" if "pointer-events-none absolute top-1/2" in seg else "INLINE"
    lbl = re.search(r'toolbox-selector-label[^>]*>([^<]*)<', seg)
    print(chev, "|", lbl.group(1) if lbl else "?")

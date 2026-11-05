# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
kw = sys.argv[2]
h = open(f, encoding="utf-8", errors="replace").read()
for m in re.finditer(re.escape(kw), h):
    s = h.rfind("<button", 0, m.start())
    e = h.find("</button>", m.start())
    seg = h[s:e+9]
    print("-----")
    print(seg[:1400])

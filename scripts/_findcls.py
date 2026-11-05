# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
kw = sys.argv[2]
h = open(f, encoding="utf-8", errors="replace").read()
for m in re.finditer(re.escape(kw), h):
    s = h.rfind("class=\"", 0, m.start())
    e = h.find("\"", s + 7)
    print(">>>", h[s:e+1][:300])

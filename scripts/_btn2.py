# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
h = open(f, encoding="utf-8", errors="replace").read()
kw = sys.argv[2]
for m in re.finditer(re.escape(kw), h):
    s = h.rfind("<button", 0, m.start())
    e = h.find("</button>", m.start())
    print("-----")
    print(h[s:e+9][:1800])

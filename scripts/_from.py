# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
kw = sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
h = open(f, encoding="utf-8", errors="replace").read()
i = h.find(kw)
print(h[i:i+n])

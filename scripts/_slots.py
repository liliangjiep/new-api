# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
path = sys.argv[1]
pat = sys.argv[2]
h = open(path, encoding="utf-8").read()
for m in re.finditer(re.escape(pat), h):
    i = m.start()
    seg = h[max(0, i - 300): i + 200]
    mm = re.search(r'data-reference-slot-key="([^"]*)"', h[max(0, i - 300): i + 200])
    print(mm.group(1) if mm else "?", "|", seg[:400])

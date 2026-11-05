# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
start_kw = sys.argv[2]
end_kw = sys.argv[3] if len(sys.argv) > 3 else None
h = open(f, encoding="utf-8", errors="replace").read()
i = h.find(start_kw)
if i < 0:
    print("NOT FOUND", start_kw)
    sys.exit()
j = h.find(end_kw, i) if end_kw else i + 4000
print(h[i - 200:j])

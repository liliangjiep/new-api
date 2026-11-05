# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
path = sys.argv[1]
pat = sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 500
after = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
h = open(path, encoding="utf-8").read()
m = re.search(re.escape(pat), h)
if not m:
    print("NOT FOUND")
else:
    print(h[max(0, m.start() - before): m.end() + after])

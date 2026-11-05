# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
path = sys.argv[1]
pat = sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 700
after = int(sys.argv[4]) if len(sys.argv) > 4 else 200
h = open(path, encoding="utf-8").read()
for m in re.finditer(r'class="([^"]*' + re.escape(pat) + r'[^"]*)"', h):
    print(m.group(1))
    print("CONTEXT:", h[max(0, m.start() - before): m.end() + after])
    print()

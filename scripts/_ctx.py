# -*- coding: utf-8 -*-
import re, sys
path = sys.argv[1]
needle = sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
h = open(path, encoding="utf-8").read()
for m in re.finditer(re.escape(needle), h):
    i = m.start()
    print("=====", i)
    print(h[max(0, i - n): i + n])
    break

# -*- coding: utf-8 -*-
import re, sys
t = open(sys.argv[1], encoding='utf-8').read()
pat = sys.argv[2] if len(sys.argv) > 2 else r'href=([^}\s]+)'
for m in re.finditer(pat, t):
    print(m.group(0)[:200])

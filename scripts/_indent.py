# -*- coding: utf-8 -*-
import sys
f, = sys.argv[1:2]
lines = open(f, encoding='utf-8').read().split('\n')
pat = sys.argv[2] if len(sys.argv) > 2 else None
for i, l in enumerate(lines):
    ind = len(l) - len(l.lstrip(' '))
    if pat is None or pat in l:
        print(i, ind, l.strip()[:120])

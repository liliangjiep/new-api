# -*- coding: utf-8 -*-
import glob, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pat = sys.argv[1]
files = sys.argv[2:] or sorted(glob.glob(".recon/ctx/orig_*.html"))
for f in files:
    h = open(f, encoding="utf-8").read()
    for m in re.finditer(r'class="([^"]*' + re.escape(pat) + r'[^"]*)"', h):
        s = max(0, m.start() - 300)
        e = min(len(h), m.end() + 300)
        print("=====", f)
        print(h[s:e])
        print()

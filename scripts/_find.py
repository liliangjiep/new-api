# -*- coding: utf-8 -*-
import glob, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pat = sys.argv[1]
for f in sorted(glob.glob(".recon/ctx/orig_*.html")):
    h = open(f, encoding="utf-8").read()
    for m in re.finditer(pat, h):
        print(f.split("\\")[-1], "|", m.group(0)[:200])

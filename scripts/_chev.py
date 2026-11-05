# -*- coding: utf-8 -*-
import sys, re, glob, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for f in sorted(glob.glob(".recon/ctx/orig_*.html")):
    h = open(f, encoding="utf-8", errors="replace").read()
    hits = set()
    for m in re.finditer(r'class="([^"]*chevron[^"]*)"', h):
        hits.add(m.group(1))
    print("==", os.path.basename(f))
    for x in sorted(hits):
        print("   ", x)

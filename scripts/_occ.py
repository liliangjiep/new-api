# -*- coding: utf-8 -*-
import re, sys, glob
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
# usage: _occ.py <cls> [file-glob]
cls = sys.argv[1]
files = sys.argv[2:] or sorted(glob.glob(".recon/ctx/orig_*.html"))
for f in files:
    h = open(f, encoding="utf-8").read()
    hits = []
    for m in re.finditer(r'class="([^"]*)"', h):
        if cls in m.group(1).split():
            hits.append(m.group(1))
    if hits:
        print("==", f, len(hits))
        for x in dict.fromkeys(hits):
            print("   ", x[:250])

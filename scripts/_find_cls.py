# -*- coding: utf-8 -*-
import glob, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pat = sys.argv[1] if len(sys.argv) > 1 else "queue-collapsed-card"
for f in sorted(glob.glob(".recon/ctx/orig_*.html")):
    h = open(f, encoding="utf-8").read()
    n = h.count(pat)
    if not n:
        continue
    print("==", f, n)
    for m in re.finditer(r'class="([^"]*' + re.escape(pat) + r'[^"]*)"', h):
        print("   ", m.group(1)[:400])

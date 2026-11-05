# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
f = sys.argv[1]
h = open(f, encoding="utf-8").read()
labels = sys.argv[2:]
if labels:
    for lab in labels:
        for mm in re.finditer('aria-label="' + lab + '"', h):
            print(lab, mm.start())
else:
    m = re.search(r"<aside[^>]*>", h)
    print(h[m.start():m.start() + 400] if m else "no aside")

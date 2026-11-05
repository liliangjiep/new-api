# -*- coding: utf-8 -*-
import sys, re, glob, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pat = sys.argv[1] if len(sys.argv) > 1 else r"toolbox-editor-panel-header[^\"]*"
for f in sorted(glob.glob(".recon/ctx/orig_*.html")):
    h = open(f, encoding="utf-8", errors="replace").read()
    for m in set(re.findall(pat, h)):
        print(os.path.basename(f), "||", m)

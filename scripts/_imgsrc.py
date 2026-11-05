# -*- coding: utf-8 -*-
import re, sys, os, urllib.request
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
path = sys.argv[1]
h = open(path, encoding="utf-8").read()
for m in re.finditer(r'reference-slot-cover-image[^>]*src="([^"]*)"', h):
    print(m.group(1))

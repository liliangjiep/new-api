# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
h = open(f, encoding="utf-8", errors="replace").read()
i = h.find("操作指引")
seg = h[i:i+20000]
j = seg.find("</section>")
seg = seg[:j]
paths = re.findall(r'data-slot="icon" class="([^"]*)"><path stroke-linecap="round" stroke-linejoin="round" d="([^"]*)"', seg)
for c, d in paths:
    print(c, "||", d)

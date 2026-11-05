# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

f = sys.argv[1]
h = open(f, encoding="utf-8", errors="replace").read()
i = h.find("最近任务")
print(h[i - 300:i + 3500])

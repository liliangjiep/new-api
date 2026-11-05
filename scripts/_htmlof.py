# -*- coding: utf-8 -*-
"""输出原站 HTML 中包含某 class 的元素的外层 HTML 片段。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

html_file = sys.argv[1]
needle = sys.argv[2]
span = int(sys.argv[3]) if len(sys.argv) > 3 else 1200

h = open(html_file, encoding="utf-8", errors="replace").read()
i = h.find(needle)
n = 0
while i != -1 and n < 3:
    print("#### occurrence", n)
    print(h[max(0, i - span): i + span].replace("><", ">\n<"))
    print("========================================")
    i = h.find(needle, i + 1)
    n += 1

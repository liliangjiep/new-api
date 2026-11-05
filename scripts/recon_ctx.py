# -*- coding: utf-8 -*-
"""在原站 HTML 中查找某个 class 的上下文片段。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
path, needle = sys.argv[1], sys.argv[2]
span = int(sys.argv[3]) if len(sys.argv) > 3 else 900
t = open(path, encoding="utf-8", errors="replace").read()
hits = list(re.finditer(re.escape(needle), t))
print("hits", len(hits))
for m in hits[:6]:
    print(">>>", t[max(0, m.start() - 200): m.start() + span].replace("><", ">\n<"))
    print("=" * 40)

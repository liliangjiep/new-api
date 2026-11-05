# -*- coding: utf-8 -*-
"""从保存的 HTML 里抽取关键元素的完整 class 字符串（未截断）。
用法: python scripts/recon_classes.py <htmlfile> <classsubstring>...
"""
import re, sys

path = sys.argv[1]
pats = sys.argv[2:] or ["genify-toolbox-3col", "workspace-main-content", "toolbox-section-gutter"]

html = open(path, encoding="utf-8").read()
for pat in pats:
    print("=" * 20, pat)
    for m in re.finditer(re.escape(pat), html):
        # 回溯到最近的 class=" 开始
        start = html.rfind('class="', 0, m.start())
        if start == -1:
            continue
        end = html.find('"', start + 7)
        cls = html[start + 7:end]
        if pat in cls:
            print(repr(cls))
            print()

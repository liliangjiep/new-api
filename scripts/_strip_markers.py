# -*- coding: utf-8 -*-
"""去掉源码里误写入的 Read 行号标记（行首 空格+数字+|）。"""
import re
import sys

pat = re.compile(r"^[ \t]{0,8}\d{1,4}\|(?=[ \t]|$)", re.M)
for path in sys.argv[1:]:
    src = open(path, encoding="utf-8").read()
    out = pat.sub("", src)
    if out != src:
        open(path, "w", encoding="utf-8", newline="").write(out)
        print("cleaned", path)
    else:
        print("clean  ", path)

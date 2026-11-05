# -*- coding: utf-8 -*-
"""从 REA 的 DOM 快照里抽取 class 树，和本地页面 DOM class 做集合对比。
REA 的 DOM 快照字段有 JSON 转义 bug，这里用正则做容错提取。"""
import json
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_rea(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    # 找出 dom 字段（HTML 字符串）
    m = re.search(r'"html"\s*:\s*"', s)
    if not m:
        # 可能是嵌套的 html 字段
        m = re.search(r'\\"html\\"\s*:\s*\\"', s)
    return s, m


if __name__ == "__main__":
    path = sys.argv[1]
    s, m = load_rea(path)
    print("file len", len(s))
    # 统计所有 class="..." 出现
    classes = Counter()
    for mm in re.finditer(r'class=\\?"([^"\\]*(?:\\.[^"\\]*)*)\\?"', s):
        raw = mm.group(1).replace('\\"', '"')
        for c in raw.split():
            classes[c] += 1
    print("distinct classes", len(classes))
    out = sys.argv[2] if len(sys.argv) > 2 else None
    if out:
        json.dump(classes, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# -*- coding: utf-8 -*-
"""对比两个 HTML 文件中某个 class 的元素结构（含父链与子元素标签）。"""
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def tokens(html):
    """返回 (tag, class_attr, start, end) 序列。"""
    out = []
    for m in re.finditer(r"<([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)(/?)>", html):
        out.append((m.group(1), m.group(2), m.start(), m.end()))
    return out


def find_class(html, cls):
    res = []
    for tag, attrs, s, e in tokens(html):
        m = re.search(r'class="([^"]*)"', attrs)
        if m and cls in m.group(1).split():
            res.append((tag, attrs, s, e))
    return res


def ancestors(html, pos):
    """粗略取 pos 之前的最近若干开标签栈。"""
    stack = []
    for tag, attrs, s, e in tokens(html):
        if s > pos:
            break
        if attrs.rstrip().endswith("/"):
            continue
        stack.append((tag, attrs[:220]))
    return stack[-4:]


def main(a, b, cls):
    ha = open(a, encoding="utf-8", errors="replace").read()
    hb = open(b, encoding="utf-8", errors="replace").read()
    fa = find_class(ha, cls)
    fb = find_class(hb, cls)
    print(f"=== {cls} ===")
    print(f"  {a}: {len(fa)}   {b}: {len(fb)}")
    for tag, attrs, s, e in fa[:2]:
        print(f"  [A] <{tag} {attrs[:300]}>")
        for at in ancestors(ha, s):
            print("      anc:", at[0], at[1][:200])
    for tag, attrs, s, e in fb[:2]:
        print(f"  [B] <{tag} {attrs[:300]}>")
        for at in ancestors(hb, s):
            print("      anc:", at[0], at[1][:200])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])

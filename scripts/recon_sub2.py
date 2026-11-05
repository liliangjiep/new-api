# -*- coding: utf-8 -*-
"""打印某页某类的完整子树（从快照 json）。
用法: python scripts/recon_sub2.py <jsonfile> <class-substr>
"""
import json, sys

def main():
    path, needle = sys.argv[1], sys.argv[2]
    d = json.load(open(path, encoding="utf-8"))

    def pr(n, depth=0):
        print("  " * depth + f'{n["t"]} | {(n.get("c") or "")[:75]} | '
              f'{repr((n.get("o") or "")[:60])} | {n.get("r")} {n.get("a", {})}')
        for k in n.get("k", []):
            pr(k, depth + 1)

    def walk(n):
        if needle in (n.get("c") or ""):
            yield n
        for k in n.get("k", []):
            yield from walk(k)

    for r in d.get("roots", []):
        for n in walk(r):
            pr(n)

if __name__ == "__main__":
    main()

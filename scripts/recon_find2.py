# -*- coding: utf-8 -*-
"""在快照 json 里搜索匹配 class 的节点，输出子树到文件（避免控制台编码问题）。
用法: python scripts/recon_find2.py <jsonfile> <class-substr> <outfile>
"""
import json, sys

def main():
    path, needle, out = sys.argv[1], sys.argv[2], sys.argv[3]
    d = json.load(open(path, encoding="utf-8"))
    lines = []

    def pr(n, depth=0):
        lines.append("  " * depth + f'{n["t"]} | {(n.get("c") or "")[:80]} | '
                     f'{(n.get("o") or "")[:70]} | {n.get("r")} {n.get("a", {})}')
        for k in n.get("k", []):
            pr(k, depth + 1)

    def walk(n):
        if needle in (n.get("c") or "") or needle in (n.get("o") or ""):
            yield n
        for k in n.get("k", []):
            yield from walk(k)

    for r in d.get("roots", []):
        for n in walk(r):
            pr(n)

    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print(f"{len(lines)} 行 → {out}")

if __name__ == "__main__":
    main()

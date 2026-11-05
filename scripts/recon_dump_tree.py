# -*- coding: utf-8 -*-
"""把快照 json 的完整 DOM 树导出为可读文本。
用法: python scripts/recon_dump_tree.py <jsonfile> <outfile> [needle]
"""
import json, sys

def main():
    path, out = sys.argv[1], sys.argv[2]
    needle = sys.argv[3] if len(sys.argv) > 3 else None
    d = json.load(open(path, encoding="utf-8"))
    lines = []

    def pr(n, dep=0):
        c = (n.get("c") or "")[:80]
        o = (n.get("o") or "")[:60]
        lines.append("  " * dep + n.get("t", "?") + " | " + c + " | " + o + " | " + str(n.get("r")) + " " + str(n.get("a", {})))
        for k in n.get("k", []):
            pr(k, dep + 1)

    for r in d.get("roots", []):
        pr(r)
    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print(str(len(lines)) + " lines -> " + out)

if __name__ == "__main__":
    main()

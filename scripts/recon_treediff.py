# -*- coding: utf-8 -*-
"""对比两份 DOM 树文本（recon_dump_tree.py 输出）。
用法: python scripts/recon_treediff.py <a.txt> <b.txt> [out]
"""
import difflib, sys

def main():
    a = open(sys.argv[1], encoding="utf-8").read().splitlines()
    b = open(sys.argv[2], encoding="utf-8").read().splitlines()
    out = sys.argv[3] if len(sys.argv) > 3 else None
    lines = list(difflib.unified_diff(a, b, "orig", "ours", lineterm="", n=1))
    txt = "\n".join(lines)
    if out:
        open(out, "w", encoding="utf-8").write(txt)
    print(f"{len(lines)} diff lines")
    for l in lines[:120]:
        print(l[:230])

if __name__ == "__main__":
    main()

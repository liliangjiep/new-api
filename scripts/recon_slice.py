# -*- coding: utf-8 -*-
"""从 html 快照里截取某个 class 的片段并清洗空白。
用法: python scripts/recon_slice.py <file> <class-substr> [len]
"""
import re, sys

def main():
    path, needle = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 2500
    s = open(path, encoding="utf-8", errors="replace").read()
    i = s.find(needle)
    if i < 0:
        print("not found")
        return
    seg = re.sub(r"\s+", " ", s[max(0, i - 200):i + n])
    print(seg)

if __name__ == "__main__":
    main()

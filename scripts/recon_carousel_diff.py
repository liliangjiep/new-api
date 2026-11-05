# -*- coding: utf-8 -*-
"""对比两份 recon_carousel.py 输出的预览面板结构。
用法: python scripts/recon_carousel_diff.py <a.json> <b.json>
"""
import json, sys

def flat(d):
    out = []
    for n in d.get("tree", []):
        out.append((n["d"], n["t"], n["c"], n["txt"]))
    return out

def main():
    a = json.load(open(sys.argv[1], encoding="utf-8"))
    b = json.load(open(sys.argv[2], encoding="utf-8"))
    for path in a:
        if path not in b:
            continue
        print("=" * 30, path)
        fa, fb = flat(a[path]), flat(b[path])
        import difflib
        sa = ["|".join([str(x[0]), x[1], x[2], x[3]]) for x in fa]
        sb = ["|".join([str(x[0]), x[1], x[2], x[3]]) for x in fb]
        for line in difflib.unified_diff(sa, sb, "orig", "ours", lineterm="", n=1):
            print(line[:260])
        print("imgs orig:", a[path].get("imgs"))
        print("imgs ours:", b[path].get("imgs"))

if __name__ == "__main__":
    main()

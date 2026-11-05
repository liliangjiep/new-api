# -*- coding: utf-8 -*-
"""对比 .recon/discover_struct.txt 中 ORIG / OURS 两段结构行，输出差异。"""
import re, sys, difflib
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

txt = open(".recon/discover_struct.txt", encoding="utf-8").read()
parts = txt.split("== OURS")
orig = parts[0].replace("== ORIG", "")
ours = parts[1]

pat = re.compile(r"\[(\d+), '(\w+)', '([^']*)', (-?\d+), (-?\d+), (-?\d+), (-?\d+)")


def norm(block):
    out = []
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        m = pat.search(line)
        out.append(m.groups() if m else (line,))
    return out


A, B = norm(orig), norm(ours)
print("orig rows:", len(A), "ours rows:", len(B))
diff = list(difflib.unified_diff([str(x) for x in A], [str(x) for x in B], lineterm="", n=0))
print("diff lines:", len(diff))
for d in diff[:80]:
    print(d)

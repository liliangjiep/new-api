# -*- coding: utf-8 -*-
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
d = json.load(open(".recon/ctx/ctx.json", encoding="utf-8"))
want = sys.argv[1:]
for path, r in d.items():
    print("=" * 20, path)
    for m in r["missing"]:
        if want and not any(w in m for w in want):
            continue
        for c in r["ctx"].get(m, []):
            print(f"  [{m}] {c}")

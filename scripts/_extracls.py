# -*- coding: utf-8 -*-
import json, re, sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ctx = json.load(open(".recon/ctx/ctx.json", encoding="utf-8"))
for route, v in ctx.items():
    extras = v["extra"]
    if not extras:
        continue
    tag = route.strip("/").replace("/", "-") or "home"
    path = f".recon/ctx/local_{tag}.html"
    if not os.path.exists(path):
        continue
    h = open(path, encoding="utf-8").read()
    print("=====", route)
    for e in extras:
        found = []
        for m in re.finditer(r'class="([^"]*)"', h):
            if e in m.group(1).split():
                found.append(m.group(1)[:180])
        print(f"  {e}  x{len(found)}")
        for f in found[:2]:
            print("     ", f)

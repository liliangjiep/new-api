# -*- coding: utf-8 -*-
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
O = json.load(open(".recon/pbO/probe.json", encoding="utf-8"))
U = json.load(open(".recon/pbU/probe.json", encoding="utf-8"))
for p in O:
    op = O[p]["probes"]
    up = (U.get(p) or {}).get("probes") or {}
    def g(pr, src):
        v = src.get(pr) or []
        return v[0]["r"] if v else None
    print(f"{p:42s}")
    for pr in (".workspace-pinned-navigation", ".workspace-main-content",
               ".toolbox-edit-region", ".toolbox-preview-region", ".toolbox-queue-region"):
        print(f"    {pr:38s} O={g(pr,op)}  U={g(pr,up)}")

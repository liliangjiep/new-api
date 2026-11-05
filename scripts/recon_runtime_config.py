# -*- coding: utf-8 -*-
"""拼接原站 RSC flight payload，并提取其中的 runtime-config JSON。"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
t = open(".recon/orig_js/index.html.html", encoding="utf-8", errors="replace").read()

chunks = []
for m in re.finditer(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', t, re.S):
    chunks.append(m.group(1))
raw = "".join(chunks)
dec = raw.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")
print("flight len", len(dec))
open(".recon/flight.txt", "w", encoding="utf-8").write(dec)

# 找包含 companyName 的 JSON 对象
idx = dec.find("companyName")
print("companyName at", idx)
if idx > 0:
    start = dec.rfind("{", 0, idx)
    # 向前扩到该行行首
    nl = dec.rfind("\n", 0, start)
    start = nl + 1 if nl > 0 else start
    depth = 0
    end = -1
    for j in range(start, len(dec)):
        ch = dec[j]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    js = dec[start:end]
    try:
        data = json.loads(js)
        json.dump(data, open(".recon/runtime-config.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("saved .recon/runtime-config.json")
        print("keys:", list(data.keys()))
    except Exception as e:
        print("parse fail", e)
        print(repr(js[:400]))
        open(".recon/runtime-config.raw.txt", "w", encoding="utf-8").write(js)

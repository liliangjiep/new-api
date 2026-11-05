# -*- coding: utf-8 -*-
"""从 RSC flight payload 中提取 siteProfile 配置与全部素材 URL。"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
t = open(".recon/flight.txt", encoding="utf-8", errors="replace").read()

i = t.find('"siteProfile"')
print("siteProfile at", i)
if i < 0:
    sys.exit(1)

# 定位 siteProfile 对象的起始 { （向前找到 "siteProfile": 后的第一个 {）
j = t.index("{", i)
depth = 0
end = -1
for k in range(j, len(t)):
    if t[k] == "{":
        depth += 1
    elif t[k] == "}":
        depth -= 1
        if depth == 0:
            end = k + 1
            break
blob = t[j:end]
# flight 里仍有反斜杠转义
blob = blob.replace('\\"', '"').replace("\\\\", "\\")
try:
    prof = json.loads(blob)
except Exception as e:
    print("parse fail", e)
    open(".recon/siteProfile.raw.txt", "w", encoding="utf-8").write(blob)
    sys.exit(1)

json.dump(prof, open(".recon/siteProfile.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved .recon/siteProfile.json")
print("top keys:", list(prof.keys()))

# 汇总所有素材 URL
urls = sorted(set(re.findall(r"https?://[^\"\\,\s]+", json.dumps(prof, ensure_ascii=False))))
print(f"\n--- {len(urls)} asset urls ---")
for u in urls:
    print(" ", u)

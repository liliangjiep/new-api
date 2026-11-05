# -*- coding: utf-8 -*-
"""下载原站面板缩略图到本地 public 目录。"""
import os
import sys

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "https://daai-asset.da-ai.vip/users/00000000-0000-0000-0000-000000000001/assets/"
OUT = "apps/web/public/images/gen"
os.makedirs(OUT, exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 Chrome/126 Safari/537.36"
files = {
    "835a5170-9685-4ffa-8c29-a979730e2ff3.png": "skill-depth-clone.png",
    "2e47cd92-7217-4aaf-8793-083d4821c5fd.png": "skill-storyboard-clone.png",
    "7e6dd297-c410-44e1-8161-15b5ef36ff48.png": "skill-element-replace-mode.png",
}
for src, dst in files.items():
    fp = os.path.join(OUT, dst)
    if os.path.exists(fp):
        print("skip", dst)
        continue
    r = s.get(BASE + src, timeout=30)
    if r.status_code == 200:
        with open(fp, "wb") as f:
            f.write(r.content)
        print("saved", dst, len(r.content))
    else:
        print("FAIL", dst, r.status_code)

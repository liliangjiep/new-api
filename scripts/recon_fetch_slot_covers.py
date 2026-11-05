# -*- coding: utf-8 -*-
"""下载原站 depth-video-clone 参考槽缩略图。"""
import os
import sys

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = "apps/web/public/toolboxs/depth-video-clone"
os.makedirs(OUT, exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 Chrome/126"
for key in ["product", "person", "background", "audio"]:
    url = f"https://susu.da-ai.cc/toolboxs/depth-video-clone/{key}.png"
    r = s.get(url, timeout=30)
    if r.status_code == 200 and r.content[:4] == b"\x89PNG":
        fp = os.path.join(OUT, f"{key}.png")
        open(fp, "wb").write(r.content)
        print("saved", fp, len(r.content))
    else:
        print("FAIL", key, r.status_code, r.headers.get("Content-Type"))

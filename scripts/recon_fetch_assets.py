# -*- coding: utf-8 -*-
"""下载原站静态资源（绝对 URL 直链），保存到 .recon/orig_js。"""
import os
import re
import sys
from urllib.parse import urlparse

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
html_path = sys.argv[1]
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
sess = requests.Session()
sess.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

t = open(html_path, encoding="utf-8").read()
urls = set(re.findall(r"(?:src|href)=[\"'](https://daai-static[^\"']+?\.(?:js|css))[\"']", t))
print("assets", len(urls))
manifest = []
for u in sorted(urls):
    name = os.path.basename(urlparse(u).path)
    fp = os.path.join(out, name)
    if not os.path.exists(fp):
        r = sess.get(u, timeout=60)
        with open(fp, "wb") as f:
            f.write(r.content)
    manifest.append({"url": u, "path": name, "size": os.path.getsize(fp)})
    print(name, os.path.getsize(fp))
import json
json.dump(manifest, open(os.path.join(out, "_manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

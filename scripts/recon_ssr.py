# -*- coding: utf-8 -*-
"""下载原站某路由的 SSR HTML（含 Next.js RSC 流），用于分析服务端渲染结构。"""
import sys
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
base = sys.argv[1].rstrip("/")
path = sys.argv[2]
out = sys.argv[3]
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36"
r = s.get(base + path, timeout=40)
open(out, "w", encoding="utf-8").write(r.text)
print("saved", out, len(r.text), r.status_code)

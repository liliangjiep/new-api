# -*- coding: utf-8 -*-
"""下载原站 Next.js 静态 chunk 到本地目录，供 REA 做静态 JS 应用分析。"""
import os
import re
import sys
from urllib.parse import urljoin

import requests

base = sys.argv[1].rstrip("/")
out = sys.argv[2]
paths = sys.argv[3:] or ["/"]

os.makedirs(out, exist_ok=True)
sess = requests.Session()
sess.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

seen = set()
queue = list(paths)
html_files = []

while queue:
    p = queue.pop(0)
    if p in seen:
        continue
    seen.add(p)
    url = urljoin(base, p)
    try:
        r = sess.get(url, timeout=30)
    except Exception as e:
        print("ERR", p, str(e)[:60])
        continue
    if r.status_code != 200:
        print("SKIP", r.status_code, p)
        continue
    ctype = r.headers.get("Content-Type", "")
    if "javascript" in ctype or p.endswith(".js"):
        name = p.strip("/").replace("/", "__") or "index.js"
        fp = os.path.join(out, name)
        if not os.path.exists(fp):
            with open(fp, "wb") as f:
                f.write(r.content)
        print("JS  ", p, len(r.content))
        # find more chunks
        for m in re.finditer(rb'"(/_next/static/[^"]+\.js)"', r.content):
            np = m.group(1).decode()
            if np not in seen:
                queue.append(np)
        for m in re.finditer(rb'"(/_next/[^"]+\.js)"', r.content):
            np = m.group(1).decode()
            if np not in seen:
                queue.append(np)
    else:
        txt = r.text
        fn = os.path.join(out, (p.strip("/").replace("/", "__") or "index.html") + ".html")
        with open(fn, "w", encoding="utf-8") as f:
            f.write(txt)
        html_files.append(fn)
        print("HTML", p, len(txt))
        for m in re.finditer(r'src="(/_next/[^"]+\.js)"', txt):
            np = m.group(1)
            if np not in seen:
                queue.append(np)
        for m in re.finditer(r'href="(/_next/static/[^"]+\.css)"', txt):
            np = m.group(1)
            fn = os.path.join(out, os.path.basename(np))
            if not os.path.exists(fn):
                with open(fn, "wb") as f:
                    f.write(sess.get(urljoin(base, np), timeout=30).content)
                print("CSS ", np)

print("done", len(seen), "urls")

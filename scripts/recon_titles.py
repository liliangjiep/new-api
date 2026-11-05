# -*- coding: utf-8 -*-
"""批量对比两站各路由的 <title>。"""
import sys

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROUTES = [
    "/",
    "/toolbox",
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/ecommerce-image-set",
    "/toolbox/depth-video-clone",
    "/toolbox/digital-human",
    "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance",
    "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
    "/canvas",
    "/assets",
    "/account",
    "/agent-cloud",
]
OA, OB = "https://susu.da-ai.cc", "http://localhost:3000"


def title(s, url):
    try:
        r = s.get(url, timeout=30)
        import re

        m = re.search(r"<title>(.*?)</title>", r.text, re.S)
        return m.group(1) if m else "(none)"
    except Exception as e:
        return f"ERR {str(e)[:40]}"


sa, sb = requests.Session(), requests.Session()
for h in (sa, sb):
    h.headers["User-Agent"] = "Mozilla/5.0 Chrome/126"

ok = 0
for p in ROUTES:
    a, b = title(sa, OA + p), title(sb, OB + p)
    match = "✓" if a == b else "✗"
    if a == b:
        ok += 1
    print(f"{match} {p:38s} orig={a!r}")
    if a != b:
        print(f"    local={b!r}")
print(f"\n{ok}/{len(ROUTES)} titles match")

# -*- coding: utf-8 -*-
"""检查原站各路由是否含轮播结构。"""
import re
import sys

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROUTES = [
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/ecommerce-image-set",
    "/toolbox/depth-video-clone",
    "/toolbox/digital-human",
    "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance",
    "/toolbox/video-watermark-remove",
    "/toolbox/video-subtitle-erase",
]
KEYS = [
    "result-example-carousel",
    "result-example-single",
    "result-example-track",
    "result-example-dots",
    "example-carousel",
    "favorite-batch-login",
    "interactive-video-cover",
]
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 Chrome/126"
print(f"{'route':40s} " + " ".join(f"{k[:22]:>22s}" for k in KEYS))
for p in ROUTES:
    r = s.get("https://susu.da-ai.cc" + p, timeout=30)
    t = r.text
    print(f"{p:40s} " + " ".join(f"{t.count(k):>22d}" for k in KEYS))

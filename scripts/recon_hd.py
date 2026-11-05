# -*- coding: utf-8 -*-
"""逐页对比原站与我们的标题/按钮清单，输出紧凑报告。"""
import json, os, sys

OD, UD = ".recon/orig", ".recon/ours3"
PAGES = [
    "/", "/toolbox", "/canvas", "/assets", "/account", "/agent-chat", "/agent-cloud",
    "/toolbox/image-generation", "/toolbox/video-generation", "/toolbox/ecommerce-image-set",
    "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase", "/toolbox/video-watermark-remove",
]


def slug(p):
    return (p.strip("/") or "root").replace("/", "__") or "root"


def load(d, p):
    f = os.path.join(d, slug(p) + ".json")
    if not os.path.exists(f):
        return None
    return json.load(open(f, encoding="utf-8"))


def heads(d):
    return [f"{h['lv']}:{h['t']}" for h in d.get("headings", []) if h["t"]]


def btns(d):
    return [b["t"] for b in d.get("buttons", [])]


for p in PAGES:
    o, u = load(OD, p), load(UD, p)
    if not o or not u:
        print(f"### {p}: missing")
        continue
    oh, uh = heads(o), heads(u)
    if oh != uh:
        print(f"### {p} HEADINGS")
        print("  orig:", oh)
        print("  ours:", uh)
    ob, ub = btns(o), btns(u)
    if set(ob) != set(ub):
        print(f"### {p} BUTTONS")
        print("  orig-only:", [b for b in ob if b not in ub])
        print("  ours-only:", [b for b in ub if b not in ob])

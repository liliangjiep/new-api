#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""补齐首页/工具箱缺失的场景封面（按用途自生成，不复用原站素材）。

- 首页「你想做什么？」8 张场景封面 -> public/images/bench/scene-entry-*.jpg (16:9, 1K)
- 工具箱石材组 2 张               -> public/images/bench/scene-entry-stone-*.jpg (16:9, 1K)
"""
import json, os, sys, time, urllib.request, concurrent.futures

KEY = os.environ.get("TOAPIS_API_KEY") or "sk-cRkObYtBheM2iDGMWbVKou6SYhsd0aUu7zFKlmd8MpCN4nEB"
BASE = "https://toapis.cn"
WEB = r"D:\code\xin-ai\apps\web\public\images\bench"

JOBS_SPEC = [
    ("scene-entry-depth-video-clone-v2",
     "Viral short-video style frame: a Chinese shop owner energetically presenting a skincare bottle to camera in a bright boutique, vertical-video composition feel, energetic, photorealistic commercial still, 16:9"),
    ("scene-entry-ecommerce-image-set",
     "Ecommerce detail set card: a coordinated set of cosmetics product shots arranged on a warm cream background with generous copy space, clean catalogue styling, photorealistic, 16:9"),
    ("scene-entry-ecommerce-video",
     "E-commerce selling video frame: a young woman presenting a cream skincare jar toward camera in a minimal studio, warm rim light, photorealistic commercial still, 16:9"),
    ("scene-entry-local-store-video",
     "Local boutique discovery frame: the warm wood-and-brass facade of a small skincare shop at golden hour with an open door, inviting street perspective, photorealistic, 16:9"),
    ("scene-entry-brand-advertising",
     "Brand advertising frame: a sculptural glass perfume bottle on a raw concrete plinth under a single directional light shaft, muted premium palette, generous negative space, photorealistic TVC still, 16:9"),
    ("scene-entry-short-drama",
     "Short-drama frame: two Chinese actors facing each other in a narrow apartment corridor with tense eye contact, cool hallway light mixed with warm room light, 35mm film look, photorealistic, 16:9"),
    ("scene-entry-stone-effect",
     "Stone effect render: a marble slab kitchen island installed in a warm modern living room, wide interior angle, soft daylight, photorealistic architectural visualization, 16:9"),
    ("scene-entry-factory-video",
     "Factory introduction frame: the interior of a stone slab factory with stacked slabs and a worker in a safety vest inspecting a slab, bright industrial lighting, photorealistic, 16:9"),
]


def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def run(job):
    name, prompt = job
    dest = os.path.join(WEB, f"{name}.jpg")
    if os.path.exists(dest) and os.path.getsize(dest) > 2000:
        return (name, "cached")
    try:
        t = post(f"{BASE}/v1/images/generations",
                 {"model": "gpt-image-2", "prompt": prompt, "size": "16:9", "resolution": "1k", "n": 1})
        tid = t.get("id")
        for _ in range(90):
            time.sleep(4)
            r = get(f"{BASE}/v1/images/generations/{tid}")
            if r.get("status") == "completed":
                url = r["result"]["data"][0]["url"]
                with urllib.request.urlopen(url, timeout=240) as resp:
                    data = resp.read()
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(data)
                return (name, "ok")
            if r.get("status") in ("failed", "cancelled"):
                return (name, f"failed:{r.get('status')}")
        return (name, "timeout")
    except Exception as e:
        return (name, f"error:{e}")


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        for name, status in ex.map(run, JOBS_SPEC):
            print(f"{name}: {status}", flush=True)

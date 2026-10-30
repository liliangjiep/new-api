#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""补齐画布页/工具箱页所需的默认图（按原站用途自行生成，不复用原站素材）。

- 4 张画布新手教程封面 -> public/images/canvas/tutorial-step-01..04.jpg (16:9, 1K)
- 7 张工具箱卡片封面   -> public/images/toolbox/*.jpg (16:9, 1K)
  覆盖原站 toolbox 页 AI创作(2) + 视频处理(4) + 其他分组的工具卡
"""
import json, os, sys, time, urllib.request, concurrent.futures

KEY = os.environ.get("TOAPIS_API_KEY") or "sk-cRkObYtBheM2iDGMWbVKou6SYhsd0aUu7zFKlmd8MpCN4nEB"
BASE = "https://toapis.cn"
WEB = r"D:\code\xin-ai\apps\web\public\images"

# —— 4 张画布新手教程封面（原站 canvas-tutorial-step-01..04 的用途） ——
CANVAS_TUTORIALS = [
    ("tutorial-step-01", "Canvas workflow tutorial cover 1: a clean infinite node graph on a light workspace canvas, an input image node on the left connected by curved wires to a model node and an output preview node, soft neutral UI illustration, no readable text, minimal, 16:9"),
    ("tutorial-step-02", "Canvas workflow tutorial cover 2: dragging a product photo node onto a canvas grid with drop shadow, minimal light-grey editor interface illustration, no readable text, 16:9"),
    ("tutorial-step-03", "Canvas workflow tutorial cover 3: a text prompt node connected to an image generation node producing a lipstick product photo thumbnail, minimal light editor illustration, no readable text, 16:9"),
    ("tutorial-step-04", "Canvas workflow tutorial cover 4: branching canvas layout with three parallel output nodes each showing a small generated product image, minimal light editor illustration, no readable text, 16:9"),
]

# —— 工具箱卡片封面（原站 toolboxs/*.png 的用途） ——
TOOLBOX_CARDS = [
    ("ai-product-image", "Ecommerce detail-set hero card: an open cosmetics gift set with a lipstick and serum bottle on a warm cream pedestal, large empty space on the left for text, soft studio light, premium photorealistic, 16:9"),
    ("digital-human", "Digital human presenter card: a Chinese woman presenter in a beige top speaking to camera in a bright studio, large empty space on the left for text, soft key light, photorealistic commercial still, 16:9"),
    ("ai-video", "AI video creation card: a cinematic 16:9 frame of a cosmetics product rotating on a reflective surface with teal light streaks, large empty space on the left for text, photorealistic, 16:9"),
    ("hot-video-remix", "Viral video remix card: a vertical short-video style frame of a shop owner presenting a product in a boutique, large empty space on the left for text, photorealistic, 16:9"),
    ("video-fission", "Video fission card: multiple duplicated vertical video frames fanning out over a soft gradient background, large empty space on the left for text, photorealistic abstract, 16:9"),
    ("subtitle-erase", "Subtitle erase card: a close-up of a video player frame with a clean empty caption bar area highlighted, large empty space on the left for text, minimal photorealistic, 16:9"),
    ("watermark-remove", "Watermark remove card: a stock footage frame being cleaned of a corner mark, large empty space on the left for text, minimal photorealistic, 16:9"),
    ("video-enhance", "Video quality enhance card: a sharp detailed cosmetics close-up with visible micro texture and clean bokeh, large empty space on the left for text, photorealistic, 16:9"),
]

JOBS = []
for name, prompt in CANVAS_TUTORIALS:
    JOBS.append((os.path.join(WEB, "canvas", f"{name}.jpg"), prompt, "16:9", "1k"))
for name, prompt in TOOLBOX_CARDS:
    JOBS.append((os.path.join(WEB, "toolbox", f"{name}.jpg"), prompt, "16:9", "1k"))


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
    dest, prompt, size, res = job
    if os.path.exists(dest) and os.path.getsize(dest) > 2000:
        return (os.path.basename(dest), "cached")
    try:
        t = post(f"{BASE}/v1/images/generations",
                 {"model": "gpt-image-2", "prompt": prompt, "size": size, "resolution": res, "n": 1})
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
                return (os.path.basename(dest), "ok")
            if r.get("status") in ("failed", "cancelled"):
                return (os.path.basename(dest), f"failed:{r.get('status')}")
        return (os.path.basename(dest), "timeout")
    except Exception as e:
        return (os.path.basename(dest), f"error:{e}")


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    jobs = [j for j in JOBS if not only or only in j[0]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        for name, status in ex.map(run, jobs):
            print(f"{name}: {status}", flush=True)

# -*- coding: utf-8 -*-
"""批量抓取原站若干页面的关键区域结构，输出到 .recon/regions/。
用法: python scripts/recon_batch.py <base_url>
"""
import json, os, sys, subprocess

BASE = sys.argv[1].rstrip("/")
OUT = ".recon/regions"

JOBS = [
    ("/toolbox/image-generation", ".toolbox-preview-panel", "img_preview_panel"),
    ("/toolbox/image-generation", ".toolbox-queue-region", "img_queue_region"),
    ("/toolbox/image-generation", ".workspace-pinned-navigation", "img_pinned_nav"),
    ("/toolbox/video-generation", ".toolbox-edit-region", "vid_edit_region"),
    ("/toolbox/ecommerce-image-set", ".toolbox-edit-region", "ec_edit_region"),
    ("/toolbox/depth-video-clone", ".toolbox-edit-region", "dvc_edit_region"),
    ("/toolbox/digital-human", ".toolbox-edit-region", "dh_edit_region"),
    ("/toolbox/hot-video-remix", ".toolbox-edit-region", "hvr_edit_region"),
    ("/toolbox/video-quality-enhance", ".toolbox-edit-region", "vqe_edit_region"),
    ("/toolbox/video-subtitle-erase", ".toolbox-edit-region", "vse_edit_region"),
    ("/toolbox/video-watermark-remove", ".toolbox-edit-region", "vwr_edit_region"),
    ("/toolbox/image-generation", ".generation-skills-navigation-list", "img_skills_nav"),
    ("/toolbox/video-generation", ".generation-skills-navigation-list", "vid_skills_nav"),
]

os.makedirs(OUT, exist_ok=True)
for path, sel, name in JOBS:
    dest = os.path.join(OUT, name + ".json")
    if os.path.exists(dest):
        print("skip", name); continue
    r = subprocess.run(
        ["python", "scripts/recon_region.py", BASE, path, sel, dest],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(name, r.stdout.strip()[:80], r.stderr.strip()[:120], flush=True)

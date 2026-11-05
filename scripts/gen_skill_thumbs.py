# -*- coding: utf-8 -*-
"""生成技能导航缩略图（.generation-skill-card-image 28×28 object-contain）。

原站实测：左侧 248px 导航面板里每个技能项有一个 28×28 的方形缩略图
（img.generation-skills-navigation-list-thumbnail，object-contain）。
我们用 skillImage(id) 指向 /images/gen/skill-<id>.jpg，这些文件全部不存在
→ 破图 → 导航面板图标区域空白/塌陷。

本脚本为每个技能 id 生成一张方形缩略图（复用已有本地素材，按 id 稳定映射），
并保证 1:1 存在，不留破图。
"""
import os, re, shutil
from PIL import Image

PUB = "apps/web/public"
GEN = os.path.join(PUB, "images", "gen")
SKILLS_TS = "apps/web/src/lib/skills.ts"
SIZE = 256  # 输出尺寸（渲染 28×28，2x 余量）

# 候选素材池（本地已有）
POOL = [
    "/images/gen/skill-image-character-four-view.jpg",
    "/images/gen/skill-image-clothing-tryon.jpg",
    "/images/gen/skill-image-face-fusion.jpg",
    "/images/gen/skill-image-face-three-view.jpg",
    "/images/gen/skill-image-garment-restyle.jpg",
    "/images/gen/skill-image-human-realism.jpg",
    "/images/gen/skill-image-image-refine.jpg",
    "/images/gen/skill-image-model-face-swap.jpg",
    "/images/gen/skill-image-person-background-swap.jpg",
    "/images/gen/skill-image-product-usage.jpg",
    "/images/gen/skill-image-product-white-bg.jpg",
    "/images/gen/skill-video-advertising-brand-proposition.jpg",
    "/images/gen/skill-video-advertising-brand-story.jpg",
    "/images/gen/skill-video-advertising-creative-concept.jpg",
    "/images/gen/skill-video-advertising-lifestyle.jpg",
    "/images/gen/skill-video-ecommerce-function-demo.jpg",
    "/images/gen/skill-video-ecommerce-pain-point-solution.jpg",
    "/images/gen/skill-video-ecommerce-promotion-conversion.jpg",
    "/images/gen/skill-video-ecommerce-scene-seeding.jpg",
    "/images/gen/skill-video-ecommerce-spoken-selling.jpg",
    "/images/gen/skill-video-local-store-discovery.jpg",
    "/images/gen/skill-video-local-store-group-buy-conversion.jpg",
    "/images/gen/skill-video-local-store-signature-experience.jpg",
    "/images/gen/skill-video-local-store-visit-record.jpg",
    "/images/gen/skill-video-short-drama-dialogue.jpg",
    "/images/gen/skill-video-short-drama-emotional.jpg",
    "/images/gen/skill-video-short-drama-product-placement.jpg",
    "/images/gen/skill-video-short-drama-reversal.jpg",
    "/images/gen/skill-video-short-drama-suspense.jpg",
]


def ids_from_ts():
    s = open(SKILLS_TS, encoding="utf-8").read()
    return sorted(set(re.findall(r'skillImage\("([^"]+)"\)', s)))


def make_thumb(src_abs, out_abs):
    im = Image.open(src_abs).convert("RGB")
    # 居中裁切为正方形后缩放
    side = min(im.width, im.height)
    left, top = (im.width - side) // 2, (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    im.save(out_abs, quality=88, optimize=True)


def main():
    os.makedirs(GEN, exist_ok=True)
    ids = ids_from_ts()
    print(f"技能 id {len(ids)} 个")
    made, skipped = 0, 0
    for i, sid in enumerate(ids):
        out_rel = f"/images/gen/skill-{sid}.jpg"
        out_abs = os.path.join(PUB, out_rel.lstrip("/"))
        if os.path.exists(out_abs):
            skipped += 1
            continue
        src_rel = POOL[i % len(POOL)]
        src_abs = os.path.join(PUB, src_rel.lstrip("/"))
        if not os.path.exists(src_abs):
            print(f"  ! 源图缺失 {src_rel}")
            continue
        make_thumb(src_abs, out_abs)
        made += 1
        print(f"  OK {out_rel}  <- {src_rel}")
    print(f"\n生成 {made} 张，跳过 {skipped} 张（已存在）")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""生成缺失的默认素材（轮播示例图 / 技能触发器图标）。

背景：源码引用了 5 个不存在的图片路径 → 浏览器渲染 0×0（破图），
      这正是「默认图片大小和复刻的网站都有很大区别」的来源。

原站实测：
  · 图片生成页「参考示例」图 1400×788（16:9）
  · 技能触发器缩略图 28×28 object-contain（正方形图标）
本脚本用已有的本地素材合成，保证尺寸/比例与原站一致。
"""
import os
from PIL import Image, ImageDraw, ImageFilter

PUB = "apps/web/public"
GEN = os.path.join(PUB, "images", "gen")


def fit(path, size, bg=(235, 235, 235)):
    im = Image.open(path).convert("RGB")
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    nw, nh = max(tw, round(im.width * scale)), max(th, round(im.height * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    out = Image.new("RGB", size, bg)
    out.paste(im.crop((left, top, left + tw, top + th)), (0, 0))
    return out


def make_example(src, out_rel, size=(1400, 788)):
    src_abs = os.path.join(PUB, src.lstrip("/"))
    out_abs = os.path.join(PUB, out_rel.lstrip("/"))
    if not os.path.exists(src_abs):
        print(f"  ! 源图缺失 {src}")
        return
    im = fit(src_abs, size)
    im.save(out_abs, quality=88, optimize=True)
    print(f"  OK {out_rel}  {size[0]}x{size[1]}")


def make_icon(src, out_rel, size=(256, 256), bg=(252, 252, 252)):
    """技能触发器图标：原站 28×28 object-contain，方形、浅底。"""
    src_abs = os.path.join(PUB, src.lstrip("/"))
    out_abs = os.path.join(PUB, out_rel.lstrip("/"))
    if not os.path.exists(src_abs):
        print(f"  ! 源图缺失 {src}")
        return
    im = Image.open(src_abs).convert("RGBA")
    im.thumbnail((size[0] - 32, size[1] - 32), Image.LANCZOS)
    canvas = Image.new("RGBA", size, bg + (255,))
    canvas.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2), im)
    canvas.convert("RGB").save(out_abs, quality=90, optimize=True)
    print(f"  OK {out_rel}  {size[0]}x{size[1]}")


def main():
    os.makedirs(GEN, exist_ok=True)

    print("[轮播示例图 1400×788（16:9，原站实测）]")
    make_example("/images/ec/ec-set-serum-scene-16x9.png", "/images/gen/example-image-1.png")
    make_example("/images/toapi/hero-showroom-16x9.png", "/images/gen/example-video-1.png")

    print("[技能触发器图标 方形]")
    make_icon("/images/bench/scene-entry-depth-video-clone-v2.jpg",
              "/images/gen/skill-depth-video-clone.png")
    make_icon("/images/bench/scene-entry-ecommerce-image-set.jpg",
              "/images/gen/skill-image-creation-v2.png")
    make_icon("/images/bench/scene-entry-brand-advertising.jpg",
              "/images/gen/skill-video-creation-v2.png")


if __name__ == "__main__":
    main()

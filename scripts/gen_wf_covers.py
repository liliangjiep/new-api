# -*- coding: utf-8 -*-
"""生成首页瀑布流专用封面（不改动其它页面共用的素材）。

原站瀑布流规则（实测 susu.da-ai.cc）：
  · item 宽固定 279.19px，高度 = 宽 × 封面自然宽高比（0 误差）
  · 5 列，列间距 8px，容器 width:100%
我们布局数据已 1:1，但复用的通用素材全是 1024x1024 → 渲染成正方形。
本脚本把每张封面**居中裁切**成原站同样的宽高比，输出到
  apps/web/public/images/wf/<index>-<name>.jpg
并输出供 discover-data.ts 使用的封面清单。

用法: python scripts/gen_wf_covers.py
"""
import json, os, re, sys
from PIL import Image

WF = ".recon/wf_orig.json"
DATA = "apps/web/src/app/discover-data.ts"
PUBLIC = "apps/web/public"
OUTDIR = os.path.join(PUBLIC, "images", "wf")
TARGET_W = 640  # 渲染宽 279px，2x 足够


def load_ours_covers():
    s = open(DATA, encoding="utf-8").read()
    i = s.find("DISCOVER_ITEMS: DiscoverItem[] = [")
    j = s.find("];", i)
    return re.findall(r'cover:\s*"([^"]+)"', s[i:j])


def main():
    orig = json.load(open(WF, encoding="utf-8"))
    items = orig["items"]
    covers = load_ours_covers()
    if len(covers) != len(items):
        print(f"! cover 数({len(covers)}) != 原站 item 数({len(items)})")
        sys.exit(1)

    os.makedirs(OUTDIR, exist_ok=True)
    manifest = []
    for idx, (it, rel) in enumerate(zip(items, covers)):
        w, h = it["rect"][2], it["rect"][3]
        target_aspect = w / h if h else 1.0
        src = os.path.join(PUBLIC, rel.lstrip("/"))
        if not os.path.exists(src):
            print(f"  [{idx}] 缺失源图 {rel}")
            continue
        im = Image.open(src).convert("RGB")
        sw, sh = im.size
        cur = sw / sh
        name = os.path.splitext(os.path.basename(rel))[0]
        out_rel = f"/images/wf/{idx:02d}-{name}.jpg"
        out_abs = os.path.join(PUBLIC, out_rel.lstrip("/"))

        if abs(cur - target_aspect) < 0.015:
            # 比例已一致，直接复制（避免重复编码损失）
            im.save(out_abs, quality=86, optimize=True)
        else:
            tw = TARGET_W
            th = max(1, round(tw / target_aspect))
            scale = max(tw / sw, th / sh)
            nw, nh = max(tw, round(sw * scale)), max(th, round(sh * scale))
            im = im.resize((nw, nh), Image.LANCZOS)
            left, top = (nw - tw) // 2, (nh - th) // 2
            im.crop((left, top, left + tw, top + th)).save(out_abs, quality=86, optimize=True)

        manifest.append({
            "i": idx, "src": rel, "out": out_rel,
            "ar": round(target_aspect, 4),
            "px": f"{TARGET_W}x{max(1, round(TARGET_W / target_aspect))}",
        })
        print(f"  [{idx:>2}] {out_rel}  {sw}x{sh} → {TARGET_W}x{max(1, round(TARGET_W / target_aspect))}")

    with open(os.path.join(".recon", "wf_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"\n生成 {len(manifest)} 张瀑布流专用封面 → {OUTDIR}")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""从实时抓取结果生成首页发现流 TS 数据文件。"""
import json, os, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

data = json.load(open(".recon/static/home_discover_live.json", encoding="utf-8"))
items = data["items"]

# 容器原点（第一项 x, y）
ox = items[0]["rect"][0]
oy = items[0]["rect"][1]

covers = []
for d in ("gen", "toapi", "ec", "bench"):
    p = os.path.join("apps/web/public/images", d)
    if os.path.isdir(p):
        for f in sorted(os.listdir(p)):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                covers.append(f"/images/{d}/{f}")

lines = []
lines.append("/* 自动生成：原站首页「发现」瀑布流数据（结构与几何 1:1，封面为本地重新生成的素材） */")
lines.append('export type DiscoverKind = "video" | "image" | "canvas";')
lines.append("")
lines.append("export interface DiscoverItem {")
lines.append("  x: number;")
lines.append("  y: number;")
lines.append("  w: number;")
lines.append("  h: number;")
lines.append("  title: string;")
lines.append("  desc: string;")
lines.append("  likes: string;")
lines.append("  kind: DiscoverKind;")
lines.append("  videoCover: boolean;")
lines.append("  cover: string;")
lines.append("}")
lines.append("")
lines.append("export const DISCOVER_ITEMS: DiscoverItem[] = [")
for i, it in enumerate(items):
    icon = it.get("icon", "")
    if "m16.5 10 4-3" in icon:
        kind = "video"
    elif "M7 3.5v17" in icon:
        kind = "canvas"
    else:
        kind = "image"
    cover = covers[i % len(covers)]
    lines.append(
        "  { x: %d, y: %d, w: %d, h: %d, title: %s, desc: %s, likes: %s, kind: %s, videoCover: %s, cover: %s },"
        % (
            it["rect"][0] - ox,
            it["rect"][1] - oy,
            it["rect"][2],
            it["rect"][3],
            json.dumps(it["title"], ensure_ascii=False),
            json.dumps(it["desc"], ensure_ascii=False),
            json.dumps(it["likes"], ensure_ascii=False),
            json.dumps(kind, ensure_ascii=False),
            "true" if it["videoCover"] else "false",
            json.dumps(cover, ensure_ascii=False),
        )
    )
lines.append("];")
lines.append("")
lines.append(
    "export const DISCOVER_TOTAL_HEIGHT = %d;"
    % max(i["rect"][3] + (i["rect"][1] - oy) for i in items)
)
lines.append("")

open("apps/web/src/app/discover-data.ts", "w", encoding="utf-8").write("\n".join(lines))
print("items", len(items), "origin", ox, oy)

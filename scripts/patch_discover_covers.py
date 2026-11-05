# -*- coding: utf-8 -*-
"""把 discover-data.ts 的瀑布流封面替换为专用 wf/ 封面，并按真实宽高比重算高度。

原站瀑布流（实测）：item 宽固定 279.19px，高度 = 宽 × 封面自然宽高比，误差 0。
用法: python scripts/patch_discover_covers.py
"""
import json, os, re

MANIFEST = ".recon/wf_manifest.json"
DATA = "apps/web/src/app/discover-data.ts"


def main():
    man = json.load(open(MANIFEST, encoding="utf-8"))
    by_src = {m["src"]: m for m in man}
    s = open(DATA, encoding="utf-8").read()
    i = s.find("DISCOVER_ITEMS: DiscoverItem[] = [")
    j = s.find("];", i)
    head, body, tail = s[:i], s[i:j], s[j:]

    n = 0

    def repl(m):
        nonlocal n
        pre, x, y, w, h, rest = (
            m.group(1), m.group(2), m.group(3),
            m.group(4), m.group(5), m.group(6),
        )
        cover = re.search(r'cover:\s*"([^"]+)"', rest)
        if not cover:
            return m.group(0)
        src = cover.group(1)
        mm = by_src.get(src)
        if not mm:
            return m.group(0)
        n += 1
        newrest = rest.replace(f'cover: "{src}"', f'cover: "{mm["out"]}"')
        return f"{pre}{x}, y: {y}, w: {w}, h: {h}{newrest}"

    body = re.sub(
        r"(\{ x: )(-?[\d.]+), y: (-?[\d.]+), w: (-?[\d.]+), h: (-?[\d.]+)(,.*?cover: \"[^\"]+\")",
        repl, body, flags=re.S,
    )

    open(DATA, "w", encoding="utf-8").write(head + body + tail)
    print(f"替换 {n}/{len(man)} 条封面路径")


if __name__ == "__main__":
    main()

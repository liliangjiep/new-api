# -*- coding: utf-8 -*-
"""把 discover-data.ts 的瀑布流几何（x/y/w/h）同步为原站实测值。

原站实测（.recon/wf_orig.json）：5 列、列宽 279.19px、列间距 8.01px、
item 高度 = 列宽 × 封面自然宽高比（0 误差）。
用法: python scripts/patch_discover_geom.py
"""
import json, re

WF = ".recon/wf_orig.json"
DATA = "apps/web/src/app/discover-data.ts"


def main():
    orig = json.load(open(WF, encoding="utf-8"))
    items = orig["items"]
    s = open(DATA, encoding="utf-8").read()
    i = s.find("DISCOVER_ITEMS: DiscoverItem[] = [")
    j = s.find("];", i)
    head, body, tail = s[:i], s[i:j], s[j:]

    # 原站 x 是相对容器的偏移，减去容器左边 112
    base_x = min(it["rect"][0] for it in items)
    base_y = min(it["rect"][1] for it in items)
    idx = {"n": 0}

    def repl(m):
        k = idx["n"]
        idx["n"] += 1
        if k >= len(items):
            return m.group(0)
        r = items[k]["rect"]
        x = round(r[0] - base_x, 2)
        y = round(r[1] - base_y, 2)
        w = round(r[2], 2)
        h = round(r[3], 2)
        rest = m.group(6)
        return f"{m.group(1)}{x}, y: {y}, w: {w}, h: {h}{rest}"

    body = re.sub(
        r"(\{ x: )(-?[\d.]+), y: (-?[\d.]+), w: (-?[\d.]+), h: (-?[\d.]+)(,.*?cover: \"[^\"]+\")",
        repl, body, flags=re.S,
    )

    # 容器总高
    total = max(it["rect"][1] - base_y + it["rect"][3] for it in items)
    body = body  # total handled below
    out = head + body + tail
    out = re.sub(r"export const DISCOVER_TOTAL_HEIGHT = [\d.]+;",
                 f"export const DISCOVER_TOTAL_HEIGHT = {round(total, 2)};", out)

    open(DATA, "w", encoding="utf-8").write(out)
    print(f"同步 {idx['n']} 条几何；容器总高 = {round(total, 2)}px（原站 {orig.get('wfStyle')}）")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""对比两次抓取的 probe.json（原站 pbO vs 本地 pbU）→ 差异报告。

用法: python scripts/recon_diff_probe.py <origdir> <oursdir> [out.txt]
"""
import json, os, sys

KEYS = ("fs", "fw", "lh", "br", "bw", "bc", "bg", "color", "pad", "mar",
        "gap", "disp", "flex", "minh", "minw", "h", "w", "overflow", "tr",
        "tfc", "bt")


def fmt(v):
    if v is None:
        return "None"
    if isinstance(v, list):
        return "[" + ", ".join(fmt(x) for x in v) + "]"
    return str(v)


def main():
    od, ud = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(od, "diff.txt")
    with open(os.path.join(od, "probe.json"), encoding="utf-8") as f:
        O = json.load(f)
    with open(os.path.join(ud, "probe.json"), encoding="utf-8") as f:
        U = json.load(f)
    lines = []
    for path, o in O.items():
        l = U.get(path)
        if not l:
            continue
        lines.append(f"\n=== {path} ===")
        lines.append(f"  status orig={o['status']} ours={l['status']}  title o={o['title']!r} l={l['title']!r}")
        if o["url"] != l["url"]:
            lines.append(f"  URL orig={o['url']}  ours={l['url']}")
        op = o["probes"] or {}
        lp = l["probes"] or {}
        for pr in op:
            a_list = op.get(pr) or []
            b_list = lp.get(pr) or []
            if not a_list and not b_list:
                continue
            if not a_list:
                lines.append(f"  {pr}: MISSING-IN-ORIG (ours={fmt(b_list[0]['r']) if b_list else '-'})")
                continue
            if not b_list:
                lines.append(f"  {pr}: MISSING-IN-OURS (orig={fmt(a_list[0]['r'])})")
                continue
            a, b = a_list[0], b_list[0]
            diffs = []
            if a["r"] != b["r"]:
                diffs.append(f"rect {fmt(a['r'])} -> {fmt(b['r'])}")
            for k in KEYS:
                if a.get(k) != b.get(k):
                    diffs.append(f"{k}: {a.get(k)} -> {b.get(k)}")
            if diffs:
                lines.append(f"  {pr}: " + " | ".join(diffs))
    report = "\n".join(lines)
    with open(out, "w", encoding="utf-8") as f:
        f.write(report)
    print(report)


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""对比原站与我们实现的页面结构差异，输出可执行的问题清单。
用法: python scripts/recon_diff.py <origdir> <oursdir> [path ...]
"""
import json, os, sys, difflib

def load(d, path):
    slug = (path.strip("/") or "root").replace("/", "__") or "root"
    p = os.path.join(d, slug + ".json")
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def flatten(doc):
    out = []
    for root in doc.get("roots", []):
        flatten_node(root, 0, out)
    return out


def flatten_node(node, depth, out):
    r = node.get("r", [0, 0, 0, 0])
    txt = node.get("o", "")
    key = node.get("c", "") or node.get("t", "")
    a = node.get("a", {})
    label = txt or a.get("aria-label") or a.get("placeholder") or a.get("href") or ""
    out.append({
        "d": depth,
        "t": node.get("t"),
        "c": key,
        "r": r,
        "label": label[:50],
        "attrs": a,
    })
    for k in node.get("k", []):
        flatten_node(k, depth + 1, out)


def sig(items):
    return [f"{i['d']}|{i['t']}|{i['c']}|{i['label']}" for i in items]


def geom(items):
    """返回 (类名签名) -> 几何 的映射，用于比较同名节点的位置/尺寸。"""
    g = {}
    for i in items:
        key = f"{i['t']}|{i['c']}"
        g.setdefault(key, []).append(i["r"])
    return g


def compare(o, u, path):
    lines = []
    a, b = flatten(o), flatten(u)
    sa, sb = sig(a), sig(b)
    sm = difflib.SequenceMatcher(None, sa, sb)
    only_a = [sa[i] for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag == "delete" for i in range(i1, i2)]
    only_b = [sb[j] for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag == "insert" for j in range(j1, j2)]
    ga, gb = geom(a), geom(b)

    lines.append(f"### {path}")
    lines.append(f"nodes: orig={len(a)} ours={len(b)}  similar={sm.ratio():.2f}")

    # 1) 原站有、我们没有
    miss = [s for s in only_a if s.split("|", 3)[3]]
    if miss:
        lines.append(f"-- MISSING in ours ({len(miss)}):")
        for s in miss[:40]:
            lines.append("   - " + s)

    # 2) 我们多出来的
    extra = [s for s in only_b if s.split("|", 3)[3]]
    if extra:
        lines.append(f"-- EXTRA in ours ({len(extra)}):")
        for s in extra[:40]:
            lines.append("   + " + s)

    # 3) 几何差异（同类名节点）
    geo = []
    for k, rects in ga.items():
        if k in gb:
            ra = rects[0]
            rb = gb[k][0]
            d = max(abs(ra[i] - rb[i]) for i in range(4))
            if d > 24 and (ra[2] > 40 or rb[2] > 40):
                geo.append((d, k, ra, rb))
    if geo:
        geo.sort(reverse=True)
        lines.append(f"-- GEOMETRY drift ({len(geo)}), worst first:")
        for d, k, ra, rb in geo[:25]:
            lines.append(f"   ~ {k}  orig={ra} ours={rb} (Δ{d}px)")

    # 4) 按钮清单差异
    ba = [x["t"] for x in o.get("buttons", [])]
    bb = [x["t"] for x in u.get("buttons", [])]
    smb = difflib.SequenceMatcher(None, ba, bb)
    bo = [ba[i] for tag, i1, i2, j1, j2 in smb.get_opcodes() if tag == "delete" for i in range(i1, i2)]
    be = [bb[j] for tag, i1, i2, j1, j2 in smb.get_opcodes() if tag == "insert" for j in range(j1, j2)]
    if bo or be:
        lines.append(f"-- BUTTON text: orig={len(ba)} ours={len(bb)}")
        if bo:
            lines.append("   orig-only: " + " | ".join(bo[:30]))
        if be:
            lines.append("   ours-only: " + " | ".join(be[:30]))

    # 5) 输入控件差异
    ia = [f"{x['t']}:{x['ph']}" for x in o.get("inputs", [])]
    ib = [f"{x['t']}:{x['ph']}" for x in u.get("inputs", [])]
    if ia != ib:
        lines.append("-- INPUTS")
        lines.append("   orig: " + " | ".join(ia[:30]))
        lines.append("   ours: " + " | ".join(ib[:30]))

    # 6) 标题层级差异
    ha = [f"{x['lv']}:{x['t']}" for x in o.get("headings", [])]
    hb = [f"{x['lv']}:{x['t']}" for x in u.get("headings", [])]
    if ha != hb:
        lines.append("-- HEADINGS")
        lines.append("   orig: " + " | ".join(ha[:30]))
        lines.append("   ours: " + " | ".join(hb[:30]))
    lines.append("")
    return "\n".join(lines)


def main():
    od, ud = sys.argv[1], sys.argv[2]
    paths = sys.argv[3:] or [
        "/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
        "/toolbox/ecommerce-image-set", "/toolbox/depth-video-clone",
        "/toolbox/digital-human", "/toolbox/hot-video-remix",
        "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
        "/toolbox/video-watermark-remove", "/canvas", "/assets", "/account",
        "/agent-chat", "/agent-cloud", "/admin",
    ]
    out = []
    for p in paths:
        o = load(od, p)
        u = load(ud, p)
        if o is None or u is None:
            out.append(f"### {p}\n  missing capture: orig={o is not None} ours={u is not None}\n")
            continue
        if "error" in o or "error" in u:
            out.append(f"### {p}\n  capture error: {o.get('error') or u.get('error')}\n")
            continue
        out.append(compare(o, u, p))
    text = "\n".join(out)
    print(text)
    with open(os.path.join(os.path.dirname(od), "diff_report.txt"), "w", encoding="utf-8") as f:
        f.write(text)


if __name__ == "__main__":
    main()

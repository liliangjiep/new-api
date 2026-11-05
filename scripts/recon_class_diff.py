# -*- coding: utf-8 -*-
"""对比原站与本地的 DOM class 集合差异，输出本地缺失的 class 列表。"""
import json
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def classes_from_html(html):
    c = Counter()
    for mm in re.finditer(r'class="([^"]*)"', html):
        for k in mm.group(1).split():
            c[k] += 1
    return c


def main(orig_html_path, local_html_path, out_path):
    oh = open(orig_html_path, encoding="utf-8", errors="replace").read()
    lh = open(local_html_path, encoding="utf-8", errors="replace").read()
    oc = classes_from_html(oh)
    lc = classes_from_html(lh)
    ok, lk = set(oc), set(lc)
    missing = sorted(ok - lk)
    extra = sorted(lk - ok)
    print(f"orig classes={len(ok)} local classes={len(lk)}")
    print(f"similarity = {len(ok & lk) / max(1, len(ok)):.4f}")
    print(f"--- missing in local ({len(missing)}) ---")
    for k in missing:
        print(" ", k, oc[k])
    print(f"--- extra in local ({len(extra)}) ---")
    for k in extra[:80]:
        print(" ", k, lc[k])
    json.dump(
        {"similarity": len(ok & lk) / max(1, len(ok)), "missing": missing, "extra": extra},
        open(out_path, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )


if __name__ == "__main__":
    main(*sys.argv[1:4])

# -*- coding: utf-8 -*-
"""扫描源码里引用的所有 /images/... 路径，检查 public 下是否存在。
用法: python scripts/check_missing_images.py
"""
import os, re, sys

ROOT = "apps/web"
PUB = os.path.join(ROOT, "public")
SRC_EXT = (".tsx", ".ts", ".jsx", ".js", ".css")

pat = re.compile(r"[\"'`](/images/[^\"'`)\s]+)[\"'`]")


def main():
    refs = {}
    for base, dirs, files in os.walk(os.path.join(ROOT, "src")):
        for fn in files:
            if not fn.endswith(SRC_EXT):
                continue
            p = os.path.join(base, fn)
            try:
                s = open(p, encoding="utf-8").read()
            except Exception:
                continue
            for m in pat.finditer(s):
                refs.setdefault(m.group(1), set()).add(os.path.relpath(p, ROOT))

    missing = []
    for ref, srcs in sorted(refs.items()):
        cand = os.path.join(PUB, ref.lstrip("/"))
        if not os.path.exists(cand):
            missing.append((ref, sorted(srcs)))

    print(f"引用 {len(refs)} 个图片路径，缺失 {len(missing)} 个")
    for ref, srcs in missing:
        print(f"  MISSING {ref}   ← {', '.join(srcs)}")

if __name__ == "__main__":
    main()

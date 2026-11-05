# -*- coding: utf-8 -*-
"""原站 vs 我方 页面截图对照（单 browser 复用，速度快）。
用法: python scripts/recon_shots.py <origbase> <oursbase> <outdir> <path1> ...
"""
import os, sys
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}


def slug_of(p):
    return (p.strip("/") or "root").replace("/", "__") or "root"


def main():
    ob, ub, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    paths = sys.argv[4:]
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=VIEWPORT, locale="zh-CN", device_scale_factor=1)
        for path in paths:
            s = slug_of(path)
            for tag, base in (("orig", ob), ("ours", ub)):
                page = ctx.new_page()
                out = os.path.join(outdir, f"{s}__{tag}.png")
                try:
                    page.goto(base.rstrip("/") + path, wait_until="domcontentloaded", timeout=45000)
                    page.wait_for_timeout(3500)
                    try:
                        page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
                        page.wait_for_timeout(1200)
                        page.evaluate("() => window.scrollTo(0, 0)")
                        page.wait_for_timeout(500)
                    except Exception:
                        pass
                    page.screenshot(path=out, full_page=True)
                    print("shot", s, tag, flush=True)
                except Exception as e:
                    print("ERR", s, tag, str(e)[:100], flush=True)
                finally:
                    page.close()
        ctx.close()
        b.close()


if __name__ == "__main__":
    main()

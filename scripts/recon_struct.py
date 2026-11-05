# -*- coding: utf-8 -*-
"""对比 orig / local 的 DOM 结构（标签 + class 序列），忽略文本内容。"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
ROUTES = sys.argv[1:] or ["/"]
OUT = ".recon/struct"
os.makedirs(OUT, exist_ok=True)

SCRIPT = """
() => {
  const out = [];
  const walk = (el, depth) => {
    if (depth > 22) return;
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase();
      const cls = (c.getAttribute('class') || '').trim().split(/\\s+/).filter(Boolean).sort().join(' ');
      out.push(depth + '|' + tag + '|' + cls);
      walk(c, depth + 1);
    }
  };
  walk(document.body, 0);
  return out;
}
"""


def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4500)
        return page.evaluate(SCRIPT)
    except Exception as e:
        print("  ERR", path, str(e)[:70])
        return None
    finally:
        page.close()


def tag(path):
    return path.strip("/").replace("/", "-") or "home"


with sync_playwright() as p:
    b = p.chromium.launch()
    octx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    lctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    for path in ROUTES:
        t = tag(path)
        o = grab(octx, ORIG, path)
        l = grab(lctx, LOCAL, path)
        json.dump(o, open(f"{OUT}/orig_{t}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(l, open(f"{OUT}/local_{t}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if o is None or l is None:
            continue
        os_, ls_ = set(o), set(l)
        only_o = sorted(os_ - ls_)
        only_l = sorted(ls_ - os_)
        inter = len(os_ & ls_) / max(1, len(os_))
        print(f"== {path} struct_sim={inter:.4f} only_orig={len(only_o)} only_local={len(only_l)}")
        for x in only_o[:12]:
            print("   O>", x)
        for x in only_l[:12]:
            print("   L>", x)
    octx.close()
    lctx.close()
    b.close()

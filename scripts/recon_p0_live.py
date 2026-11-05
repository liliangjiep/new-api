# -*- coding: utf-8 -*-
"""P0 视觉层实时校验：原站 vs 本地（同一脚本、同一浏览器上下文、同一等待策略）。

用法: python scripts/recon_p0_live.py [out.txt]
"""
import os, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

JS = """() => {
  const cs = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = c[p];
    const r = el.getBoundingClientRect();
    o.rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    return o;
  };
  const box = ["borderRadius","fontSize","height","backgroundColor","color","gap",
               "padding","borderColor","borderWidth","boxShadow","transition","minHeight","flexGrow"];
  return {
    body: cs("body", ["backgroundColor","color","borderColor","fontFamily"]),
    btnPrimary: cs(".ui-button-primary", box),
    btnGhost: cs(".ui-button-ghost", box),
    selectorTrigger: cs(".toolbox-selector-trigger", box),
    composer: cs(".prompt-composer-root", box),
    editRegion: cs(".toolbox-edit-region", ["minHeight","height"]),
    genRoot: cs(".generation-root", ["minHeight","height","flexGrow"]),
    wfItem: cs(".ui-waterfall-item", ["height","width"]),
    wfImg: cs(".ui-waterfall-item img", ["height","width","objectFit"]),
    wfCount: document.querySelectorAll(".ui-waterfall-item").length,
    wfTotal: (() => { const w=document.querySelector(".ui-waterfall"); return w?w.getBoundingClientRect().height:null; })(),
    wfHeights: Array.from(document.querySelectorAll(".ui-waterfall-item")).slice(0,10)
      .map(e => Math.round(e.getBoundingClientRect().height)),
  };
}"""

PATHS = ["/", "/toolbox/image-generation", "/toolbox/video-quality-enhance",
         "/toolbox/video-subtitle-erase", "/toolbox/video-watermark-remove",
         "/toolbox/depth-video-clone"]


def grab(ctx, base, path):
    page = ctx.new_page()
    out = {}
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
        time.sleep(4)
        out = page.evaluate(JS)
    except Exception as e:
        out = {"err": str(e)[:150]}
    finally:
        page.close()
    return out


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else ".recon/p0_live.txt"
    lines = []
    with sync_playwright() as p:
        br = p.chromium.launch()
        octx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in PATHS:
            o = grab(octx, ORIG, path)
            l = grab(lctx, LOCAL, path)
            lines.append(f"\n=== {path} ===")
            if o.get("err") or l.get("err"):
                lines.append(f"  ERR o={o.get('err')} l={l.get('err')}")
                continue
            for key in o:
                if key in ("err",):
                    continue
                ov, lv = o.get(key), l.get(key)
                if ov == lv:
                    continue
                lines.append(f"  {key}:")
                lines.append(f"      O: {ov}")
                lines.append(f"      U: {lv}")
        br.close()
    txt = "\n".join(lines)
    with open(out, "w", encoding="utf-8") as f:
        f.write(txt)
    print(txt)


if __name__ == "__main__":
    main()

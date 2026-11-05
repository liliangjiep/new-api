# -*- coding: utf-8 -*-
"""检查各工具页的面板头标题文案 + 提交按钮内部度量（原站 vs 本地）。"""
import sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}
PATHS = ["/toolbox/image-generation", "/toolbox/video-generation",
         "/toolbox/depth-video-clone", "/toolbox/digital-human",
         "/toolbox/ecommerce-image-set", "/toolbox/hot-video-remix",
         "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
         "/toolbox/video-watermark-remove"]

JS = """() => {
  const back = document.querySelector('.toolbox-back-current');
  const title = back ? back.textContent.trim() : null;
  const credit = document.querySelector('.generation-submit-credit');
  const creditLabel = document.querySelector('.generation-submit-label');
  const btn = document.querySelector('.ui-button-primary');
  const hint = Array.from(document.querySelectorAll('span'))
    .map(s => s.textContent.trim())
    .find(t => t.startsWith('支持') && t.length > 20);
  const R = e => { if(!e) return null; const r=e.getBoundingClientRect();
    return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; };
  return {
    backTitle: title,
    btn: R(btn),
    credit: R(credit),
    creditText: credit ? credit.textContent.trim() : null,
    creditFont: credit ? getComputedStyle(credit).fontFamily : null,
    creditFs: credit ? getComputedStyle(credit).fontSize : null,
    creditLS: credit ? getComputedStyle(credit).letterSpacing : null,
    label: R(creditLabel),
    labelText: creditLabel ? creditLabel.textContent.trim() : null,
    hint: hint || null,
  };
}"""


def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        octx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in PATHS:
            res = {}
            for name, ctx, base in (("O", octx, ORIG), ("U", lctx, LOCAL)):
                page = ctx.new_page()
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                    time.sleep(3.5)
                    res[name] = page.evaluate(JS)
                except Exception as e:
                    res[name] = {"err": str(e)[:80]}
                finally:
                    page.close()
            o, l = res["O"], res["U"]
            diffs = []
            for k in o:
                if o.get(k) != l.get(k):
                    diffs.append(f"    {k}:\n      O={o.get(k)}\n      U={l.get(k)}")
            print(f"\n=== {path} ===")
            if diffs:
                print("\n".join(diffs))
            else:
                print("    (identical)")
        br.close()


if __name__ == "__main__":
    main()

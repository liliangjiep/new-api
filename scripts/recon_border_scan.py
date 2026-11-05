# -*- coding: utf-8 -*-
"""扫描原站所有元素计算出的 borderColor，统计分布。"""
import sys, collections
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const c = {};
  const samples = {};
  document.querySelectorAll('*').forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.borderTopWidth !== '0px' || cs.borderBottomWidth !== '0px') {
      const k = cs.borderTopColor;
      c[k] = (c[k]||0)+1;
      if (!samples[k]) samples[k] = (typeof e.className === 'string' ? e.className : '').slice(0,80);
    }
  });
  return {counts: c, samples: samples};
}"""

PATHS = ["/", "/toolbox", "/toolbox/image-generation", "/toolbox/digital-human",
         "/toolbox/hot-video-remix", "/toolbox/ecommerce-image-set", "/account"]

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for path in PATHS:
            for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
                ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
                page = ctx.new_page()
                page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)
                r = page.evaluate(JS)
                print(f"--- {name} {path} ---")
                for k, v in sorted(r["counts"].items(), key=lambda x: -x[1]):
                    print(f"   {v:5d}  {k}   e.g. {r['samples'][k]}")
                page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

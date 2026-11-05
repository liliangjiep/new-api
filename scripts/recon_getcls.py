# -*- coding: utf-8 -*-
"""打印指定路径的 class 字符串（原站 vs 本地）。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """(paths) => {
  const root = document.querySelector('.toolbox-editor-panel-root') || document.body;
  const map = {};
  const walk = (e, path) => {
    map[path] = {tag: e.tagName.toLowerCase(), cls: typeof e.className === 'string' ? e.className : ''};
    Array.from(e.children).forEach((c,i) => walk(c, path + '/' + i));
  };
  walk(root, '');
  return paths.map(p => [p, map[p] ? map[p].cls : null]);
}"""

def main():
    path = sys.argv[1]
    paths = sys.argv[2:]
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"===== {name} =====")
            for pth, cls in page.evaluate(JS, paths):
                print(f"  {pth}\n     {cls}")
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()

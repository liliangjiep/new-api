# -*- coding: utf-8 -*-
"""抓取一个站点的若干页面，输出结构化 JSON（布局几何 + 类名 + 文本 + 交互元素）。
用法: python scripts/recon_capture.py <base_url> <outdir> <path1> <path2> ...
"""
import json, os, sys, re
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}

# 原站栅格由运行时 JS 计算并写入 inline style；我们本地 dev 首次编译较慢。
# 必须等到 --toolbox-expanded-columns 落地，否则量到的是 fallback 栅格（假差异）。
SETTLE_JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  if (!g) return true;
  return !!(g.getAttribute('style') || '').includes('--toolbox-expanded-columns');
}"""


def settle(page, timeout_ms=25000):
    """等待页面布局稳定：栅格 inline style 就绪 + 网络空闲 + 图片解码完成。"""
    import time
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        try:
            if page.evaluate(SETTLE_JS):
                break
        except Exception:
            pass
        time.sleep(250)
    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    try:
        # 图片解码可能因懒加载永远不 resolve —— 加超时保护
        page.evaluate("""() => {
          window.__imgSettled = false;
          Promise.all(
            Array.from(document.images).filter(i => !i.complete)
              .map(i => new Promise(res => { i.onload = i.onerror = res; }))
          ).then(() => { window.__imgSettled = true; });
        }""")
        deadline = time.time() + 6
        while time.time() < deadline:
            if page.evaluate("() => window.__imgSettled === true"):
                break
            time.sleep(200)
    except Exception:
        pass
    page.wait_for_timeout(1200)


def normalize(cls):
    if not isinstance(cls, str):
        return ""
    # 保留语义类名（toolbox-* / workspace-* / ui-* 等），去掉 tailwind 原子类噪声
    keep = re.findall(r"(?:[a-z]+-)*[a-z]+(?:-[a-z0-9]+)+", cls)
    keep = [k for k in keep if not k.startswith(("text-", "bg-", "p-", "px-", "py-", "m-", "mx-", "my-", "gap-", "w-", "h-", "min-w-", "max-w-", "flex-", "grid-", "rounded-", "border-", "hover:", "sm:", "lg:", "max-lg:", "transition", "duration-"))]
    return " ".join(dict.fromkeys(keep))


def collect(page):
    return page.evaluate(
        """() => {
      const norm = (cls) => {
        if (typeof cls !== 'string') return '';
        const keep = cls.split(/\\s+/).filter(c => /^[a-z]+(-[a-z0-9]+)+$/.test(c) && !/^(text|bg|p|px|py|m|mx|my|gap|w|h|min|max|flex|grid|rounded|border|transition|duration|shadow|ring|outline|top|left|right|bottom|z|inset|space|order|col|row|items|justify|self|overflow|truncate|whitespace|font|leading|tracking|opacity|pointer|select|resize|list|appearance)-/.test(c));
        return [...new Set(keep)].join(' ');
      };
      const node = (el, depth) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');
        const o = {
          t: el.tagName.toLowerCase(),
          c: norm(el.className),
          r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          d: cs.display,
          g: cs.gridTemplateColumns === 'none' ? '' : cs.gridTemplateColumns,
          o: own.slice(0, 80),
          a: {},
        };
        for (const k of ['role','aria-label','type','placeholder','href','aria-current','aria-selected','aria-expanded','disabled']) {
          const v = el.getAttribute && el.getAttribute(k);
          if (v) o.a[k] = v.slice(0, 80);
        }
        if (el.tagName === 'IMG') { o.img = el.getAttribute('src') || ''; }
        if (depth < 9) o.k = Array.from(el.children).map(c => node(c, depth + 1));
        return o;
      };
      const roots = Array.from(document.body.children)
        .filter(e => !['SCRIPT','STYLE','NEXT-ROUTE-ANNOUNCER'].includes(e.tagName));
      return {
        url: location.href,
        title: document.title,
        bodyClass: norm(document.body.className),
        roots: roots.map(e => node(e, 0)),
        buttons: Array.from(document.querySelectorAll('button,[role="button"],a')).map(b => ({
          t: (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\\s+/g,' ').slice(0,60),
          c: norm(b.className),
          r: (() => { const r = b.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
          dis: b.disabled || b.getAttribute('aria-disabled') === 'true',
        })).filter(b => b.t),
        inputs: Array.from(document.querySelectorAll('input,textarea,select')).map(i => ({
          t: i.tagName.toLowerCase(),
          ph: i.getAttribute('placeholder') || '',
          val: (i.value || '').slice(0,40),
          c: norm(i.className),
          r: (() => { const r = i.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
        })),
        headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => ({
          lv: h.tagName, t: (h.innerText||'').trim().replace(/\\s+/g,' ').slice(0,60),
          c: norm(h.className),
          r: (() => { const r = h.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
        })),
        imgs: Array.from(document.querySelectorAll('img')).map(i => ({ src: i.getAttribute('src')||'', r: (()=>{const r=i.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];})() })),
      };
    }"""
    )


def main():
    base = sys.argv[1].rstrip("/")
    outdir = sys.argv[2]
    paths = sys.argv[3:]
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            url = base + path
            page = ctx.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                settle(page)
                data = collect(page)
            except Exception as e:
                data = {"error": str(e)}
            slug = (path.strip("/") or "root").replace("/", "__") or "root"
            with open(os.path.join(outdir, slug + ".json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
            print("captured", path, flush=True)
            page.close()
        ctx.close()
        browser.close()


if __name__ == "__main__":
    main()

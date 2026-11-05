# -*- coding: utf-8 -*-
"""批量抓取原站整页大纲（不含样式），用于逐页照抄。
用法: python scripts/recon_page_outline.py <base_url> <path> [out]
"""
import json, os, sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None

JS = """
() => {
  const SEM = /(toolbox|generation|prompt|reference|model|settings|option|skill|navigation|queue|preview|submit|editor|composer|upload|slot|audio|avatar|video|image|ecommerce|depth|remix|quality|subtitle|watermark|effect|section|panel|field|form|header|title|button|btn|row|col|card|list|item|wrap|shell|body|content|root|box|grid|slot|tab|action|actions|toolbar|input|select|switch|trigger|badge|label|placeholder|hint|empty|state|preview|stage|display|carousel|step|stepper|counter|number|count|batch|track|playlist|controller|timeline|home|hero|composer|footer|sidebar|asset|account|admin|agent|canvas|discover|workflow|task|recent|history|folder|filter|grid|card|menu|nav)/;
  const short = (cls) => {
    if (typeof cls !== 'string') return '';
    const parts = cls.split(/\\s+/).filter(c => SEM.test(c));
    return [...new Set(parts)].slice(0,4).join(' ');
  };
  const node = (el, depth) => {
    const r = el.getBoundingClientRect();
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const o = { t: el.tagName.toLowerCase(), c: short(el.className),
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      own: own.slice(0,90), a: {}, kids: [] };
    for (const k of ['role','aria-label','type','placeholder','href','aria-current','aria-selected','src']) {
      const v = el.getAttribute && el.getAttribute(k);
      if (v) o.a[k] = String(v).slice(0,120);
    }
    if (el.tagName === 'IMG') o.a.src = (el.getAttribute('src')||'').slice(0,140);
    if (depth < 12) for (const c of el.children) o.kids.push(node(c, depth+1));
    return o;
  };
  const roots = Array.from(document.body.children)
    .filter(e => !['SCRIPT','STYLE','NEXT-ROUTE-ANNOUNCER'].includes(e.tagName));
  return { url: location.href, title: document.title, roots: roots.map(e => node(e,0)) };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4500)
    data = page.evaluate(JS)
    ctx.close(); b.close()

def pr(n, depth=0):
    r = n.get("r", [0,0,0,0])
    bits = [f'{k}={n["a"][k]}' for k in ("role","aria-label","type","placeholder","href","aria-current") if n["a"].get(k)]
    print(f'{"  "*depth}<{n["t"]} {r[2]}x{r[3]}@{r[0]},{r[1]}'
          + (f' .{n["c"]}' if n["c"] else "")
          + (f' "{n["own"]}"' if n["own"] else "")
          + (" [" + " ".join(bits) + "]" if bits else "")
          + (f' src={n["a"]["src"]}' if n["a"].get("src") else ""))
    for k in n.get("kids", []):
        pr(k, depth+1)

print(f"== {path} :: {data['title']}")
for root in data["roots"]:
    pr(root)

if out:
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

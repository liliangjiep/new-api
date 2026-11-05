# -*- coding: utf-8 -*-
"""瀹炴椂涓ょ珯瀵规瘮锛堝甫 settle 绛夋爡鏍艰惤鍦帮級锛岄€愯妭鐐规瘮杈冨嚑浣?+ 鍏抽敭鏍峰紡銆?鐢ㄦ硶: python scripts/recon_live_diff.py <origbase> <oursbase> [path...]
"""
import json, sys, difflib
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}

JS = """() => {
  const norm = (cls) => {
    if (typeof cls !== 'string') return '';
    const keep = cls.split(/\\s+/).filter(c => /^[a-z]+(-[a-z0-9]+)+$/.test(c) &&
      !/^(text|bg|p|px|py|m|mx|my|gap|w|h|min|max|flex|grid|rounded|border|transition|duration|shadow|ring|outline|top|left|right|bottom|z|inset|space|order|col|row|items|justify|self|overflow|truncate|whitespace|font|leading|tracking|opacity|pointer|select|resize|list|appearance|absolute|relative|block|inline|hidden|table)-/.test(c));
    return [...new Set(keep)].join(' ');
  };
  const node = (el, depth) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');
    const o = { t: el.tagName.toLowerCase(), c: norm(el.className),
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      d: cs.display, o: own.slice(0, 80), a: {} };
    for (const k of ['role','aria-label','placeholder','href','aria-current']) {
      const v = el.getAttribute && el.getAttribute(k);
      if (v) o.a[k] = v.slice(0, 60);
    }
    if (el.tagName === 'IMG') { o.img = el.getAttribute('src') || ''; o.nat = [el.naturalWidth, el.naturalHeight]; }
    if (depth < 9) o.k = Array.from(el.children).map(c => node(c, depth + 1));
    return o;
  };
  const roots = Array.from(document.body.children)
    .filter(e => !['SCRIPT','STYLE','NEXT-ROUTE-ANNOUNCER'].includes(e.tagName));
  return { url: location.href, title: document.title, roots: roots.map(e => node(e, 0)) };
}"""


def settle(page):
    import time
    deadline = time.time() + 25
    while time.time() < deadline:
        try:
            if page.evaluate("() => { const g = document.querySelector('.genify-toolbox-3col');"
                             " return !g || !!(g.getAttribute('style')||'').includes('--toolbox-expanded-columns'); }"):
                break
        except Exception:
            pass
        time.sleep(250)
    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(1500)


def flat(doc):
    out = []
    def w(n):
        lab = (n.get("o", "") or n.get("a", {}).get("aria-label", "") or "")[:40]
        out.append({"k": f'{n.get("t")}|{n.get("c")}|{lab}', "r": n.get("r", [0,0,0,0]),
                    "nat": n.get("nat")})
        for k in n.get("k", []):
            w(k)
    for r in doc.get("roots", []):
        w(r)
    return out


def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or ["/", "/toolbox/image-generation"]
    out_path = None
    if paths and paths[-1].endswith(".txt"):
        out_path = paths.pop()
    lines = []

    def emit(s=""):
        lines.append(s)

    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            res = {}
            for tag, base in (("O", ob), ("X", ub)):
                page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                settle(page)
                res[tag] = page.evaluate(JS)
            page.close()
            emit(f"\n===== {path} =====")
            emit(f"  title  orig={res['O'].get('title')!r}")
            emit(f"         ours={res['X'].get('title')!r}")
            a, b_ = flat(res["O"]), flat(res["X"])
            ka = [x["k"] for x in a]
            kb = [x["k"] for x in b_]
            sm = difflib.SequenceMatcher(None, ka, kb)
            miss, extra, drift, natbad = [], [], [], []
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag in ("delete", "replace"):
                    miss += a[i1:i2]
                if tag in ("insert", "replace"):
                    extra += b_[j1:j2]
                if tag == "equal":
                    for i, j in zip(range(i1, i2), range(j1, j2)):
                        ra, rb = a[i]["r"], b_[j]["r"]
                        d = max(abs(ra[x] - rb[x]) for x in range(4))
                        if d > 4:
                            drift.append((d, ka[i], ra, rb))
                        na, nb = a[i].get("nat"), b_[j].get("nat")
                        if na and nb and na[0] and nb[0] and na != nb:
                            natbad.append((ka[i], na, nb))
            miss = [m for m in miss if m["k"].split("|")[2]]
            extra = [x for x in extra if x["k"].split("|")[2]]
            drift.sort(reverse=True)
            emit(f"  ratio={sm.ratio():.3f} MISSING={len(miss)} EXTRA={len(extra)} drift>4px={len(drift)} img-size-mismatch={len(natbad)}")
            for m in miss[:14]:
                emit(f"   - {m['k'][:100]} {m['r']}")
            for x in extra[:14]:
                emit(f"   + {x['k'][:100]} {x['r']}")
            for d, k, ra, rb in drift[:18]:
                emit(f"   D{d:>5} {k[:70]}  orig={ra} ours={rb}")
            for k, na, nb in natbad[:8]:
                emit(f"   IMG {k[:70]}  orig_nat={na} ours_nat={nb}")
        ctx.close()
        b.close()

    txt = "\n".join(lines)
    if out_path:
        open(out_path, "w", encoding="utf-8").write(txt)
        print("wrote " + out_path)
    else:
        try:
            print(txt)
        except UnicodeEncodeError:
            print(txt.encode("utf-8", "replace").decode("utf-8"))


if __name__ == "__main__":
    main()

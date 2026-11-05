# -*- coding: utf-8 -*-
"""逐元素「计算样式 + 几何」对比原站 vs 我方，输出可执行差异清单。

用法: python scripts/recon_elem_diff.py <origbase> <oursbase> <path> [path ...]
"""
import sys, json
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}

JS = """
() => {
  const props = ['backgroundColor','color','borderTopWidth','borderTopColor','borderTopLeftRadius',
    'boxShadow','fontSize','fontWeight','lineHeight','letterSpacing','padding','gap','opacity','display',
    'flexDirection','alignItems','justifyContent','position','zIndex'];
  const out = [];
  const nodes = document.body.querySelectorAll('*');
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    if (['script','style','noscript','meta','link','title','head'].includes(tag)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    const own = Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
    const style = {};
    for (const p of props) style[p] = cs[p];
    out.push({
      t: tag,
      cls: (typeof el.className === 'string' ? el.className : ''),
      r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      txt: own.slice(0,40),
      st: style,
    });
  }
  return out;
}
"""

def key(n):
    return (n["t"], n["cls"], n["txt"])

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            data = {}
            for tag, base in (("O", ob), ("X", ub)):
                page = ctx.new_page()
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                    page.wait_for_timeout(3500)
                    data[tag] = page.evaluate(JS)
                except Exception as e:
                    data[tag] = []
                    print("ERR", tag, path, str(e)[:80])
                page.close()
            o, x = data["O"], data["X"]
            # 1) class multiset diff
            from collections import Counter
            co, cx = Counter(n["cls"] for n in o), Counter(n["cls"] for n in x)
            only_o = [c for c in (co - cx).elements()]
            only_x = [c for c in (cx - co).elements()]
            print(f"\n===== {path}  orig={len(o)} ours={len(x)}")
            if only_o:
                print(f"-- classes only in ORIG ({len(only_o)}):")
                for c in sorted(set(only_o))[:20]:
                    print("   -", c[:150])
            if only_x:
                print(f"-- classes only in OURS ({len(only_x)}):")
                for c in sorted(set(only_x))[:20]:
                    print("   +", c[:150])
            # 2) geometry drift for matched elements
            om = {}
            for n in o:
                om.setdefault(key(n), []).append(n)
            xm = {}
            for n in x:
                xm.setdefault(key(n), []).append(n)
            drift = []
            for k, ol in om.items():
                if k not in xm:
                    continue
                xl = xm[k]
                for a, b2 in zip(ol, xl):
                    d = sum(abs(a["r"][i] - b2["r"][i]) for i in range(4))
                    if d > 8:
                        drift.append((d, k, a["r"], b2["r"]))
            drift.sort(reverse=True)
            if drift:
                print(f"-- GEOMETRY drift ({len(drift)}), worst 12:")
                for d, k, rr, xr in drift[:12]:
                    print(f"   Δ{d} {k[0]}|{k[1][:60]}|{k[2][:24]} orig={rr} ours={xr}")
            # 3) style diffs on matched
            sdiff = {}
            for k, ol in om.items():
                if k not in xm:
                    continue
                for a, b2 in zip(ol, xm[k]):
                    for p2 in a["st"]:
                        if a["st"][p2] != b2["st"][p2]:
                            sdiff.setdefault(p2, []).append((k[1][:70], a["st"][p2], b2["st"][p2]))
            for p2, lst in sorted(sdiff.items(), key=lambda kv: -len(kv[1])):
                print(f"-- style prop {p2}: {len(lst)} diffs")
                for c, ov, xv in lst[:8]:
                    print(f"     [{c}]")
                    print(f"        orig={ov}")
                    print(f"        ours={xv}")
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()

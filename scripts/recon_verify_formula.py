# -*- coding: utf-8 -*-
"""在原站页面里复算 grid 公式，验证与实际 inline style 是否一致。
用法: python scripts/recon_verify_formula.py <base_url> [path]
"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"

JS = """
() => {
  const t = document.querySelector('.genify-toolbox-3col');
  const r = t.closest('.workspace-main-shell');
  const n = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const a = getComputedStyle(t);
  const l = t.parentElement ? getComputedStyle(t.parentElement) : null;
  const s = l ? parseFloat(l.paddingLeft) + parseFloat(l.paddingRight) : 0;
  const o = Math.max(1, (r ? r.getBoundingClientRect().width - 56 - s : t.getBoundingClientRect().width) - 2*parseFloat(a.columnGap));
  const e = window.innerWidth;
  const c = e >= 2200, u = e >= 1800;
  const d = (c?32:u?30:29) * n;
  const p = c?0.57:u?0.54:0.51;
  const out = {};
  for (const [k, isExp] of [['expanded', true], ['collapsed', false]]) {
    const av = isExp
      ? (c ? 12.5*n : u ? Math.min(12.75*n, Math.max(10.5*n, .105*e)) : Math.min(12.25*n, Math.max(10*n, .11*e)))
      : (u ? 4.75 : 4.5) * n;
    const ew = Math.max(d, (o-av)*p/(1+p));
    const pw = Math.max(1, o-av-ew);
    const mins = ['386px','0', isExp ? '150px' : '0'];
    out[k] = [ew, pw, av].map((v,i)=>`minmax(${mins[i]},${v.toFixed(3)}fr)`).join(' ');
  }
  const sec = t.parentElement;
  const secR = sec.getBoundingClientRect();
  return {
    win: e,
    fontSize: n,
    mainShellW: r ? r.getBoundingClientRect().width : null,
    parentPadL: l ? l.paddingLeft : null,
    parentPadR: l ? l.paddingRight : null,
    s,
    columnGap: a.columnGap,
    o,
    sectionW: secR.width, sectionX: secR.x,
    gridW: t.getBoundingClientRect().width, gridX: t.getBoundingClientRect().x,
    computedCols: getComputedStyle(t).gridTemplateColumns,
    inlineStyle: t.getAttribute('style'),
    formula: out,
    pinnedExpanded: (() => { const p = document.querySelector('.workspace-pinned-navigation'); return p ? {w: p.getBoundingClientRect().width, layoutExpanded: p.getAttribute('data-layout-expanded')} : null; })(),
  };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1280, 1440, 1600, 1920, 2200):
        ctx = b.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3500)
        d = page.evaluate(JS)
        f = d["formula"]
        inline = d.get("inlineStyle") or ""
        ok_exp = f["expanded"] in inline
        ok_col = f["collapsed"] in inline
        print(f'{w}: gridW={d["gridW"]} secW={d["sectionW"]} o={round(d["o"],1)} '
              f'expMatch={ok_exp} colMatch={ok_col} pinned={d["pinnedExpanded"]}')
        print("   formula.expanded :", f["expanded"])
        print("   inline.expanded  :", [x for x in inline.split(";") if "expanded" in x])
        print("   computed cols    :", d["computedCols"])
        ctx.close()
    b.close()

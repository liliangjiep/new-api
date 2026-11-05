() => {
  const out = {};
  const car = document.querySelector('.result-example-carousel');
  if (car) {
    const r = car.getBoundingClientRect();
    const cs = getComputedStyle(car);
    out.carousel = {rect:[r.x,r.y,r.width,r.height], cls: car.className,
      h: cs.height, maxH: cs.maxHeight, aspect: cs.aspectRatio, flex: cs.flex,
      align: cs.alignItems, justify: cs.justifyContent, ovf: cs.overflow};
    const p = car.parentElement;
    const pr = p.getBoundingClientRect();
    const pcs = getComputedStyle(p);
    out.carParent = {tag:p.tagName, cls: p.className, rect:[pr.x,pr.y,pr.width,pr.height],
      h: pcs.height, maxH: pcs.maxHeight, aspect: pcs.aspectRatio, display: pcs.display};
  }
  const disp = document.querySelector('.result-example-display');
  if (disp) {
    const r = disp.getBoundingClientRect();
    const cs = getComputedStyle(disp);
    out.display = {rect:[r.x,r.y,r.width,r.height], cls: disp.className, gap: cs.gap,
      pad: cs.padding, justify: cs.justifyContent};
    const c2 = disp.querySelector('.result-example-content');
    if (c2) {
      const r2 = c2.getBoundingClientRect();
      const cs2 = getComputedStyle(c2);
      out.content = {rect:[r2.x,r2.y,r2.width,r2.height], cls: c2.className,
        h: cs2.height, maxH: cs2.maxHeight, aspect: cs2.aspectRatio,
        margin: cs2.margin, flex: cs2.flex, display: cs2.display};
      const st = c2.querySelector('.result-example-stage');
      if (st) { const r3 = st.getBoundingClientRect(); const cs3 = getComputedStyle(st);
        out.stage = {rect:[r3.x,r3.y,r3.width,r3.height], cls: st.className, flex: cs3.flex, gap: cs3.gap}; }
    }
  }
  return out;
}

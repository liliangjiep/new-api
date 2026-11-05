() => {
  const out = {};
  out.titles = Array.from(document.querySelectorAll('title')).map(t => t.textContent);
  const gen = document.querySelector('.generation-root');
  if (gen) {
    const r = gen.getBoundingClientRect();
    out.generationRoot = {rect:[r.x,r.y,r.width,r.height], cls: gen.className};
    const dump = (el, d, max) => {
      if (d > max) return '';
      let s = '';
      for (const c of Array.from(el.children)) {
        const cr = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        s += '  '.repeat(d) + c.tagName.toLowerCase() + '.' + (c.className.toString().split(' ').slice(0,3).join('.')) +
          ' [' + Math.round(cr.width) + 'x' + Math.round(cr.height) + '@' + Math.round(cr.y) + ']' +
          ' flex=' + cs.flex + ' h=' + cs.height + ' minH=' + cs.minHeight +
          ' ovf=' + cs.overflow + ' gap=' + cs.gap + ' | ' + c.className.toString().slice(0,200) + '\n';
        s += dump(c, d+1, max);
      }
      return s;
    };
    out.tree = dump(gen, 0, 3);
  }
  const panel = document.querySelector('.generation-skill-panel');
  if (panel) {
    const r = panel.getBoundingClientRect();
    out.skillPanel = {rect:[r.x,r.y,r.width,r.height], left: getComputedStyle(panel).left,
      pos: getComputedStyle(panel).position};
    // 找 fixed 定位的祖先 transform
    let p = panel.parentElement, chain = [];
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      chain.push({tag:p.tagName, cls:p.className.toString().slice(0,120), transform: cs.transform,
                  filter: cs.filter, perspective: cs.perspective, contain: cs.contain, willChange: cs.willChange});
      p = p.parentElement;
    }
    out.ancestors = chain;
  }
  return out;
}

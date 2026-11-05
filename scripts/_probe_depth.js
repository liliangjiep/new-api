() => {
  const out = {};
  const dump = (el, d, max, out) => {
    if (d > max) return;
    for (const c of Array.from(el.children)) {
      const cr = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      out.push('  '.repeat(d) + c.tagName.toLowerCase() +
        ' [' + Math.round(cr.width) + 'x' + Math.round(cr.height) + '@' + Math.round(cr.x) + ',' + Math.round(cr.y) + ']' +
        ' flex=' + cs.flex + ' mt=' + cs.marginTop + ' mb=' + cs.marginBottom +
        ' gap=' + cs.gap + ' | ' + c.className.toString().slice(0,150));
      dump(c, d + 1, max, out);
    }
  };
  const stage = document.querySelector('.result-example-stage');
  if (stage) { const arr = []; dump(stage, 0, 2, arr); out.stageChildren = arr; }
  const slots = document.querySelector('.depth-video-clone-reference-slots');
  if (slots) { const arr = []; dump(slots, 0, 3, arr); out.slots = arr; }
  const root = document.querySelector('.depth-video-clone-input-shell');
  if (root) { const arr = []; dump(root, 0, 1, arr); out.shell = arr; }
  return out;
}

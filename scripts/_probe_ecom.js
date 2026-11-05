() => {
  const out = {};
  const dump = (el, d, max, arr) => {
    if (d > max) return;
    for (const c of Array.from(el.children)) {
      const cr = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      arr.push('  '.repeat(d) + c.tagName.toLowerCase() +
        ' [' + Math.round(cr.width) + 'x' + Math.round(cr.height) + '@' + Math.round(cr.x) + ',' + Math.round(cr.y) + ']' +
        ' flex=' + cs.flex + ' mt=' + cs.marginTop + ' text=' + (c.textContent||'').trim().slice(0,40) +
        ' | ' + c.className.toString().slice(0,120));
      dump(c, d + 1, max, arr);
    }
  };
  const stage = document.querySelector('.result-example-stage');
  if (stage) { const arr = []; dump(stage, 0, 2, arr); out.stage = arr; }
  const disp = document.querySelector('.result-example-display');
  if (disp) { const arr = []; dump(disp, 0, 1, arr); out.display = arr; }
  // 所有 img 尺寸
  out.imgs = Array.from(document.querySelectorAll('.result-example-image')).slice(0,3).map(i => {
    const r = i.getBoundingClientRect();
    return {w: Math.round(r.width), h: Math.round(r.height),
            nat: [i.naturalWidth, i.naturalHeight], src: i.getAttribute('src').slice(-40)};
  });
  return out;
}

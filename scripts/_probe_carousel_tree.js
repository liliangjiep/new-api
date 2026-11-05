() => {
  const car = document.querySelector('.result-example-carousel');
  if (!car) return {err: 'no carousel'};
  const dump = (el, depth, max) => {
    if (depth > max) return '';
    let s = '';
    for (const c of Array.from(el.children)) {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      s += '  '.repeat(depth) + c.tagName.toLowerCase() +
        ' [' + Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.x) + ',' + Math.round(r.y) + ']' +
        ' of=' + cs.objectFit + ' maxW=' + cs.maxWidth + ' maxH=' + cs.maxHeight +
        ' ovf=' + cs.overflow + ' pos=' + cs.position + ' tr=' + (cs.transform||'').slice(0,60) +
        ' gap=' + cs.gap + ' pad=' + cs.padding + ' aspect=' + cs.aspectRatio +
        ' justify=' + cs.justifyContent + ' align=' + cs.alignItems +
        ' | ' + c.className.toString().slice(0,260) + '\n';
      s += dump(c, depth + 1, max);
    }
    return s;
  };
  const r = car.getBoundingClientRect();
  return {carouselRect: [r.x, r.y, r.width, r.height], tree: dump(car, 0, 5)};
}

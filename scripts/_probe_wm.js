() => {
  const out = {};
  const arr = [];
  const dump = (el, d, max, arr) => {
    if (d > max) return;
    for (const c of Array.from(el.children)) {
      const cr = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      arr.push('  '.repeat(d) + c.tagName.toLowerCase() +
        ' [' + Math.round(cr.width) + 'x' + Math.round(cr.height) + '@' + Math.round(cr.x) + ',' + Math.round(cr.y) + ']' +
        ' aria=' + (c.getAttribute('aria-label')||'-') +
        ' | ' + c.className.toString().slice(0,130));
      dump(c, d + 1, max, arr);
    }
  };
  const panel = document.querySelector('.toolbox-editor-panel-root');
  if (panel) { dump(panel, 0, 3, arr); out.panelTree = arr; }
  return out;
}

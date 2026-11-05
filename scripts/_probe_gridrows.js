() => {
  const out = {};
  const shell = document.querySelector('.depth-video-clone-input-shell');
  if (shell) {
    const cs = getComputedStyle(shell);
    out.shell = {
      rows: cs.gridTemplateRows, cols: cs.gridTemplateColumns,
      rowGap: cs.rowGap, colGap: cs.columnGap, pad: cs.padding,
      display: cs.display,
      rect: (r=>[r.x,r.y,r.width,r.height])(shell.getBoundingClientRect()),
    };
    out.kids = Array.from(shell.children).map(c => {
      const cr = c.getBoundingClientRect();
      const ccs = getComputedStyle(c);
      return {cls: c.className.toString().split(' ').slice(0,2).join(' '),
        rect:[Math.round(cr.x),Math.round(cr.y),Math.round(cr.width),Math.round(cr.height)],
        gridRow: ccs.gridRow, gridCol: ccs.gridColumn};
    });
  }
  const hdr = document.querySelector('.depth-video-clone-input-header');
  if (hdr) {
    const cs = getComputedStyle(hdr);
    out.header = {gridRow: cs.gridRow, gridCol: cs.gridColumn, h: cs.height,
      kids: Array.from(hdr.children).map(c => c.className.toString().split(' ')[0]),
      html: hdr.innerHTML.slice(0, 400)};
  }
  return out;
}

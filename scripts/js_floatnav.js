() => {
  const out = [];
  document.querySelectorAll('.workspace-floating-navigation').forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      i,
      rect: [r.x, r.y, r.width, r.height],
      transform: cs.transform,
      opacity: cs.opacity,
      position: cs.position,
      visibility: cs.visibility,
      pointerEvents: cs.pointerEvents,
      zIndex: cs.zIndex,
      top: cs.top, height: cs.height, width: cs.width,
      left: cs.left, right: cs.right,
      transition: cs.transition,
      attrs: Array.from(el.attributes).map(a => a.name + '=' + a.value).join(' '),
    });
  });
  const bridges = Array.from(document.querySelectorAll('.workspace-floating-navigation-hover-bridge')).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { rect: [r.x, r.y, r.width, r.height], position: cs.position, zIndex: cs.zIndex };
  });
  const surfaces = Array.from(document.querySelectorAll('.workspace-floating-navigation-surface')).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { rect: [r.x, r.y, r.width, r.height], position: cs.position, transform: cs.transform, opacity: cs.opacity, borderRadius: cs.borderRadius, bg: cs.backgroundColor };
  });
  const bb = document.querySelector('.workspace-mobile-bottombar-items');
  let bbInfo = null;
  if (bb) {
    const r = bb.getBoundingClientRect();
    const cs = getComputedStyle(bb);
    bbInfo = { rect: [r.x, r.y, r.width, r.height], display: cs.display, position: cs.position, cls: bb.className };
  }
  return { out, bridges, surfaces, bbInfo };
}

() => {
  const f = Array.from(document.querySelectorAll('.workspace-floating-navigation')).map(el => ({
    label: el.getAttribute('aria-labelledby'),
    title: (el.querySelector('.workspace-navigation-title') || {}).textContent,
  }));
  const p = Array.from(document.querySelectorAll('.workspace-pinned-navigation')).map(el => ({
    id: el.id,
    title: (el.querySelector('.workspace-navigation-title') || {}).textContent,
    rect: (() => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })(),
  }));
  const pb = document.querySelector('.workspace-mobile-bottombar');
  let pbi = null;
  if (pb) { const r = pb.getBoundingClientRect(); const cs = getComputedStyle(pb); pbi = { rect: [r.x, r.y, r.width, r.height], display: cs.display, cls: pb.className }; }
  return { floating: f, pinned: p, bottombar: pbi, bodyChildren: Array.from(document.body.children).map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '')) };
}

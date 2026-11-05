() => {
  const el = document.querySelector('.workspace-shell');
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    className: el.className,
    height: cs.height,
    minHeight: cs.minHeight,
    rect: [r.x, r.y, r.width, r.height],
    varValue: getComputedStyle(document.documentElement).getPropertyValue('--global-operation-notice-height'),
  };
}

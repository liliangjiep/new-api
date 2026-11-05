() => {
  const out = {};
  const cs = getComputedStyle(document.documentElement);
  const names = ['--background','--foreground','--muted','--subtle','--border','--accent',
                 '--on-accent','--surface','--color-home-scene-card-bg','--color-home-entry-heading',
                 '--color-home-entry-description','--color-home-entry-text','--color-home-page-bg'];
  out.root = {};
  for (const n of names) out.root[n] = cs.getPropertyValue(n).trim();
  const b = getComputedStyle(document.body);
  out.body = {bg: b.backgroundColor, color: b.color, fs: b.fontSize};
  const card = document.querySelector('.home-entry-scene-card');
  if (card) {
    const c = getComputedStyle(card);
    out.card = {bg: c.backgroundColor, color: c.color, radius: c.borderRadius,
                border: c.borderColor, bw: c.borderWidth};
  }
  const h1 = document.querySelector('h1');
  if (h1) { const c = getComputedStyle(h1); out.h1 = {text: h1.textContent.trim().slice(0,60), fs: c.fontSize, fw: c.fontWeight, color: c.color}; }
  const tabs = Array.from(document.querySelectorAll('.toolbox-preview-tab')).map(t => {
    const c = getComputedStyle(t);
    return {text: t.textContent.trim(), fw: c.fontWeight, color: c.color};
  });
  out.tabs = tabs;
  const sep = document.querySelector('.toolbox-preview-tab-separator');
  if (sep) { const c = getComputedStyle(sep); out.sep = {bg: c.backgroundColor, w: c.width, h: c.height, mx: c.marginLeft}; }
  const ex = document.querySelector('.result-example-display');
  if (ex) { const r = ex.getBoundingClientRect(); out.ex = [r.x, r.y, r.width, r.height]; }
  return out;
}

() => {
  const out = {};
  const panel = document.querySelector('.generation-skill-panel');
  if (panel) {
    const cs = getComputedStyle(panel);
    out.panel = {left: cs.left, top: cs.top, pos: cs.position, transform: cs.transform,
      translate: cs.translate, scale: cs.scale, rotate: cs.rotate,
      offsetParent: panel.offsetParent ? panel.offsetParent.tagName + '.' + panel.offsetParent.className.toString().slice(0,80) : null,
      offsetLeft: panel.offsetLeft, offsetTop: panel.offsetTop,
      rect: (r=>[r.x,r.y,r.width,r.height])(panel.getBoundingClientRect()),
      anim: cs.animationName};
  }
  const floats = Array.from(document.querySelectorAll('aside.workspace-floating-navigation'));
  out.floats = floats.map(f => {
    const r = f.getBoundingClientRect(); const cs = getComputedStyle(f);
    return {rect:[r.x,r.y,r.width,r.height], disp: cs.display, vis: cs.visibility,
            op: cs.opacity, transform: cs.transform, cls: f.className.slice(0,140)};
  });
  out.skillCardImgs = document.querySelectorAll('.generation-skill-card-image').length;
  // panel box-shadow / border
  const p2 = document.querySelector('.toolbox-editor-panel-root');
  if (p2) { const cs = getComputedStyle(p2);
    out.panelStyle = {bc: cs.borderColor, bw: cs.borderWidth, bs: cs.borderStyle,
      shadow: cs.boxShadow, bg: cs.backgroundColor}; }
  const p3 = document.querySelector('.toolbox-preview-panel');
  if (p3) { const cs = getComputedStyle(p3);
    out.previewStyle = {bc: cs.borderColor, bw: cs.borderWidth, shadow: cs.boxShadow, bg: cs.backgroundColor}; }
  return out;
}

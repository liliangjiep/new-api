() => {
  const out = {};
  out.title = document.title;
  const tab = document.querySelector('.toolbox-preview-tab');
  if (tab) {
    const cs = getComputedStyle(tab);
    out.tab = {text: tab.textContent.trim(), fw: cs.fontWeight, fs: cs.fontSize,
               color: cs.color, cls: tab.className};
  }
  const tabs = Array.from(document.querySelectorAll('.toolbox-preview-tab')).map(t => ({
    text: t.textContent.trim(), fw: getComputedStyle(t).fontWeight,
    color: getComputedStyle(t).color}));
  out.tabs = tabs;
  const ex = document.querySelector('.result-example-display');
  if (ex) {
    out.example = {rect: (r => [r.x, r.y, r.width, r.height])(ex.getBoundingClientRect()),
                   cls: ex.className};
  }
  const car = document.querySelector('.result-example-carousel');
  if (car) {
    const r = car.getBoundingClientRect();
    out.carousel = {rect: [r.x, r.y, r.width, r.height], cls: car.className};
  }
  const img = document.querySelector('.result-example-image');
  if (img) {
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    out.image = {rect: [r.x, r.y, r.width, r.height], objectFit: cs.objectFit,
                 maxW: cs.maxWidth, maxH: cs.maxHeight, cls: img.className};
  }
  const content = document.querySelector('.result-example-content');
  if (content) {
    const r = content.getBoundingClientRect();
    const cs = getComputedStyle(content);
    out.content = {rect: [r.x, r.y, r.width, r.height], aspect: cs.aspectRatio,
                   maxH: cs.maxHeight, cls: content.className};
  }
  const track = document.querySelector('.result-example-track');
  if (track) {
    const r = track.getBoundingClientRect();
    out.track = {rect: [r.x, r.y, r.width, r.height], cls: track.className};
  }
  const vp = document.querySelector('.result-example-viewport');
  if (vp) {
    const r = vp.getBoundingClientRect();
    out.viewport = {rect: [r.x, r.y, r.width, r.height], cls: vp.className};
  }
  return out;
}

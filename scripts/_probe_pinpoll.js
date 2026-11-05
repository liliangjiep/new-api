async () => {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const pin = document.querySelector('.workspace-pinned-navigation');
    const g = document.querySelector('.genify-toolbox-3col');
    const main = document.querySelector('.workspace-main-content');
    out.push({
      t: i * 1000,
      pinW: pin ? Math.round(pin.getBoundingClientRect().width) : null,
      pinExp: pin ? pin.getAttribute('data-layout-expanded') : null,
      grid: g ? getComputedStyle(g).gridTemplateColumns : null,
      mainX: main ? Math.round(main.getBoundingClientRect().x) : null,
    });
    await new Promise(r => setTimeout(r, 1000));
  }
  return out;
}

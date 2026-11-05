() => {
  const out = {};
  out.titles = Array.from(document.querySelectorAll('title')).map(t => t.textContent);
  out.docTitle = document.title;
  const ind = document.querySelector('.result-example-indicators');
  if (ind) {
    const p = ind.parentElement;
    out.indicators = {parent: p.className.toString().slice(0,120),
      isInStage: !!p.closest('.result-example-stage')};
  }
  const nav = document.querySelector('nav[aria-label=当前位置]');
  if (nav) { const r = nav.getBoundingClientRect(); out.nav = [r.width, nav.textContent.trim()]; }
  const btn = document.querySelector('.toolbox-editor-panel-header button[aria-label=新建], .toolbox-editor-panel-header .ui-button-ghost');
  if (btn) { const r = btn.getBoundingClientRect(); out.newBtn = [r.width, r.height, btn.textContent.trim()]; }
  const submit = document.querySelector('.generation-submit-title');
  if (submit) { out.submitSvg = !!submit.querySelector('svg'); }
  const stage = document.querySelector('.result-example-stage');
  if (stage) {
    const kids = Array.from(stage.children).map(c => c.className.toString().split(' ')[0]);
    out.stageKids = kids;
  }
  return out;
}

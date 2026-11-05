() => {
  const out = {};
  out.hasLoginBtn = !!document.querySelector('.header-user-login');
  const btn = document.querySelector('.header-user-login');
  if (btn) {
    const r = btn.getBoundingClientRect();
    out.loginBtn = {rect:[r.x,r.y,r.width,r.height], text: btn.textContent.trim(),
      cls: btn.className, aria: btn.getAttribute('aria-label')};
  }
  // 登录弹窗
  out.modal = !!document.querySelector('.modal-login-shell');
  out.modalPanel = !!document.querySelector('.modal-login-panel');
  const tabs = Array.from(document.querySelectorAll('.auth-login-tabs button')).map(b => b.textContent.trim());
  out.authTabs = tabs;
  const form = document.querySelector('.auth-login-form');
  if (form) {
    out.inputs = Array.from(form.querySelectorAll('input')).map(i => ({
      ph: i.placeholder, type: i.type, cls: i.className.slice(0,120)}));
  }
  out.submit = document.querySelector('.auth-login-submit')?.textContent.trim();
  out.agreement = !!document.querySelector('.auth-login-agreement');
  out.header = document.querySelector('.modal-login-header')?.textContent.trim();
  out.close = !!document.querySelector('.modal-login-close');
  out.backdrop = !!document.querySelector('.modal-backdrop');
  const hdr = document.querySelector('.modal-login-header h2, .modal-login-header');
  if (hdr) { const r = hdr.getBoundingClientRect(); out.headerRect = [r.x,r.y,r.width,r.height]; }
  const panel = document.querySelector('.modal-login-panel');
  if (panel) { const r = panel.getBoundingClientRect(); out.panelRect = [r.x,r.y,r.width,r.height]; }
  return out;
}

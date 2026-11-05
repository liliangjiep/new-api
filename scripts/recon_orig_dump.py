import sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

def grab(ctx, base, path, js):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        return page.evaluate(js)
    except Exception as e:
        print("ERR", path, str(e)[:120]); return []
    finally:
        page.close()

JS_PANEL = """() => {
  const pp = document.querySelector('.toolbox-preview-panel');
  if(!pp) return ['NO PANEL'];
  return [pp.outerHTML.slice(0, 6000)];
}"""

JS_THUMB = """() => {
  const out=[];
  document.querySelectorAll('.video-thumbnail-image').forEach(e=>{
    out.push(e.tagName + ' | class=' + e.className);
    out.push('  parent: ' + e.parentElement.tagName + '.' + e.parentElement.className);
  });
  const h = document.querySelector('.video-generation-prompt-helper-button');
  if(h) out.push('HELPER: ' + h.tagName + '|' + h.className + '| parent=' + h.parentElement.tagName+'.'+h.parentElement.className);
  const f = document.querySelector('.video-generation-prompt-fullscreen-toggle');
  if(f) out.push('FS: ' + f.className);
  return out;
}"""

JS_ACC = """() => {
  const out=[];
  document.querySelectorAll('.header-user-tab-trigger').forEach(e=>out.push(e.tagName+'|'+e.className));
  return out;
}"""

JS_AG = """() => {
  const main = document.querySelector('main') || document.body;
  const out=[];
  const root = main.querySelector('div');
  out.push(main.outerHTML.slice(0,2500));
  return out;
}"""

JS_HOME = """() => {
  const out=[];
  document.querySelectorAll('[class*=discover-card-cover-image]').forEach(e=>out.push(e.tagName+'|'+e.className));
  return out;
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path, js in [("/toolbox/digital-human", JS_PANEL), ("/toolbox/video-generation", JS_THUMB),
                     ("/account", JS_ACC), ("/agent-cloud", JS_AG), ("/", JS_HOME)]:
        print("#"*25, path)
        for x in grab(octx, "https://susu.da-ai.cc", path, js): print(x)
    octx.close(); br.close()

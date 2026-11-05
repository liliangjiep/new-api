import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

JS = """() => {
  const out=[];
  const pp=document.querySelector('.toolbox-preview-panel');
  if(pp) out.push('PANEL_HTML:\n'+pp.outerHTML.slice(0,3000));
  return out;
}"""

JS2 = """() => {
  const out=[];
  document.querySelectorAll('*').forEach(e=>{
    const c=e.className||'';
    if(typeof c==='string' && (c.includes('flex flex-1 flex-col min-h-0')||c.includes('min-h-0 flex flex-1 flex-col'))) {
      let p=e.parentElement;
      out.push('EL '+e.tagName+'.'+c+'\n  parent:'+(p?p.tagName+'.'+p.className:'none'));
    }
  });
  return out;
}"""

def grab(ctx, base, path, js):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        return page.evaluate(js)
    except Exception as e:
        print("ERR", path, str(e)[:80]); return []
    finally:
        page.close()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    print("### digital-human ORIG panel")
    for x in grab(octx, "https://susu.da-ai.cc", "/toolbox/digital-human", JS): print(x)
    print("### digital-human LOCAL panel")
    for x in grab(lctx, "http://localhost:3000", "/toolbox/digital-human", JS): print(x)
    print("### agent-cloud ORIG")
    for x in grab(octx, "https://susu.da-ai.cc", "/agent-cloud", JS2): print(x)
    print("### agent-cloud LOCAL")
    for x in grab(lctx, "http://localhost:3000", "/agent-cloud", JS2): print(x)
    octx.close(); lctx.close(); br.close()

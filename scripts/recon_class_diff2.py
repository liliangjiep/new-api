import sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/", "/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/hot-video-remix", "/toolbox/video-quality-enhance", "/account", "/agent-cloud"]

JS = """() => {
  function path(el){
    const parts=[];
    while(el && el.tagName && parts.length<5){
      let s=el.tagName.toLowerCase();
      if(el.id) { s+='#'+el.id; parts.unshift(s); break; }
      const p=el.parentElement;
      if(p){ const idx=Array.prototype.indexOf.call(p.children, el)+1; s+=`:nth-child(${idx})`; }
      parts.unshift(s);
      el=el.parentElement;
    }
    return parts.join('>');
  }
  const map={};
  document.querySelectorAll('*').forEach(el=>{
    const c=el.getAttribute('class');
    if(!c) return;
    const k=c.trim().split(/\\s+/).sort().join(' ');
    if(!map[k]) map[k]=[];
    map[k].push({tag:el.tagName.toLowerCase(), cls:el.className, path:path(el), txt:(el.textContent||'').trim().slice(0,40)});
  });
  return map;
}"""

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        return page.evaluate(JS)
    except Exception as e:
        print("ERR", path, str(e)[:80]); return {}
    finally:
        page.close()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        o = grab(octx, "https://susu.da-ai.cc", path)
        l = grab(lctx, "http://localhost:3000", path)
        miss = sorted(set(o)-set(l)); extra = sorted(set(l)-set(o))
        print("="*30, path, "miss=%d extra=%d" % (len(miss), len(extra)))
        for k in miss:
            print(" MISS", k[:220])
            for e in o[k][:2]:
                print("      O:", e["tag"], "|", (e["cls"] or "")[:160], "|", e["txt"])
        for k in extra:
            print(" EXTRA", k[:220])
            for e in l[k][:2]:
                print("      L:", e["tag"], "|", (e["cls"] or "")[:160], "|", e["txt"])
    octx.close(); lctx.close(); br.close()

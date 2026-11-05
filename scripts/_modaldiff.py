import re, sys, difflib
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def norm(p):
    h = open(p, encoding='utf-8', errors='replace').read()
    h = re.sub(r'<script.*?</script>', '', h, flags=re.S)
    # tokenize tags
    toks = re.findall(r'<[^>]+>|[^<]+', h)
    out = []
    for t in toks:
        t = t.strip()
        if not t: continue
        out.append(t)
    return out

a = norm('.recon/orig_login_modal.html')
b = norm('.recon/local_login_modal.html')
print('orig tokens', len(a), 'local tokens', len(b))
for line in difflib.unified_diff(a, b, 'orig', 'local', lineterm='', n=1):
    print(line[:400])

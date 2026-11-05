import re, glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sorted(glob.glob('.recon/ctx/orig_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r'<div[^>]*role="textbox"[^>]*>', s):
        print(f.split('/')[-1], '::', m.group(0)[:400])

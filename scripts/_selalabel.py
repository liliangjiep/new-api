import re, sys, io, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sorted(glob.glob('.recon/ctx/orig_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    hits = re.findall(r'<button[^>]*toolbox-selector-trigger[^>]*>', s)
    print('==', os.path.basename(f), len(hits))
    for h in hits[:4]:
        m = re.search(r'aria-label="([^"]*)"', h)
        print('   ', m.group(1) if m else '(none)')

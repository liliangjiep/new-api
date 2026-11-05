import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sys.argv[1:]:
    s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
    svgs = re.findall(r'<svg[^>]*class="([^"]*)"', s)
    from collections import Counter
    c = Counter(svgs)
    print('==', f)
    for k, v in sorted(c.items()):
        if 'h-3' in k and 'w-3' in k:
            print('   ', v, k)

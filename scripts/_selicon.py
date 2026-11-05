import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sys.argv[1:]:
    s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
    print('==', f, 'selector-icon:', s.count('toolbox-selector-icon'), 'trigger:', s.count('toolbox-selector-trigger'))
    for m in re.finditer(r'<span class="toolbox-selector-icon[^"]*"[^>]*><svg[^>]*class="([^"]*)"', s):
        print('   icon svg:', m.group(1))

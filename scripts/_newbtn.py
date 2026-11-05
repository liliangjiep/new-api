import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sys.argv[1:]:
    s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
    print('==', f)
    for m in re.finditer(r'<svg[^>]*class="([^"]*)"[^>]*>(?:(?!</svg>).)*?</svg>\s*(?:</button>)?', s, re.S):
        pass
    # find svgs followed by 新建
    for m in re.finditer(r'<svg([^>]*)>(.{0,600}?)</svg>(.{0,20})', s, re.S):
        if '新建' in m.group(2):
            cls = re.search(r'class="([^"]*)"', m.group(1))
            print('   新建 svg class:', cls.group(1) if cls else '(none)')

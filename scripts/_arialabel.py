import re, collections, sys

for f in sys.argv[1:]:
    s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
    c = collections.Counter(re.findall(r'aria-label="([^"]{1,12})"', s))
    print(f, dict(c))

import re, sys

f = sys.argv[1]
pat = sys.argv[2]
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
for m in re.finditer(pat, s):
    print('---')
    print(s[max(0, m.start()-250):m.end()+150].replace('\n', ' '))

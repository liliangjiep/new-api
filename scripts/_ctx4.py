import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]; pat = sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 200
after = int(sys.argv[4]) if len(sys.argv) > 4 else 300
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
for m in re.finditer(pat, s):
    print('---')
    print(s[max(0, m.start()-before):m.end()+after])

import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]; pat = sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 200
after = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
m = re.search(pat, s)
if not m:
    print('NOT FOUND'); sys.exit()
print(s[max(0, m.start()-before):m.end()+after])

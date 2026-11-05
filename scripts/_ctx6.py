import re, glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]; needle = sys.argv[2]
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
i = s.find(needle)
print('idx', i)
if i >= 0:
    print(s[max(0, i-1500):i+1500])

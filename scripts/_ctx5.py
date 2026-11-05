import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]; needle = sys.argv[2]
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
idx = 0
n = 0
while True:
    i = s.find(needle, idx)
    if i < 0: break
    n += 1
    print('--- #%d' % n)
    print(s[max(0, i-500):i+300].replace('\n', ' '))
    idx = i + 1
    if n >= int(sys.argv[3] if len(sys.argv) > 3 else 3): break

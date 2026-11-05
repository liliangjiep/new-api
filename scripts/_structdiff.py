import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
t = sys.argv[1]
o = json.load(open('.recon/struct/orig_%s.json' % t, encoding='utf-8'))
l = json.load(open('.recon/struct/local_%s.json' % t, encoding='utf-8'))
so, sl = set(o), set(l)
print('--- only orig (%d)' % len(so - sl))
for x in sorted(so - sl):
    print('  O>', x)
print('--- only local (%d)' % len(sl - so))
for x in sorted(sl - so):
    print('  L>', x)

import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
t = sys.argv[1]
which = sys.argv[2] if len(sys.argv) > 2 else 'local'
data = json.load(open('.recon/struct/%s_%s.json' % (which, t), encoding='utf-8'))
for x in data:
    d = x.split('|', 1)[0]
    if len(sys.argv) > 3 and int(d) < int(sys.argv[3]):
        continue
    if len(sys.argv) > 4 and int(d) > int(sys.argv[4]):
        continue
    print(x[:200])

import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
t = sys.argv[1]
which = sys.argv[2]
needle = sys.argv[3]
data = json.load(open('.recon/struct/%s_%s.json' % (which, t), encoding='utf-8'))
for x in data:
    if needle in x:
        print(x[:250])

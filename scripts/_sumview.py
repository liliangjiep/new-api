import json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
d = json.load(open('.recon/classdiff/summary.json', encoding='utf-8'))
for r in d:
    if r['path'] in ('/toolbox/depth-video-clone', '/', '/account', '/canvas'):
        print('===', r['path'], r['similarity'])
        print('missing:', r['missing'])
        print('extra:', r['extra'])
        print()

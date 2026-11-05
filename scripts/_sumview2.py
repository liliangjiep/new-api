import json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
d = json.load(open('.recon/classdiff/runtime_summary.json', encoding='utf-8'))
for r in d:
    if r['path'] in ('/toolbox', '/canvas', '/account', '/agent-cloud', '/assets'):
        print('===', r['path'], r['similarity'])
        print('missing:', r['missing'])
        print('extra:', r['extra'])
        print()

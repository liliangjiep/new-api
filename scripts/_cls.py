# -*- coding: utf-8 -*-
import re, os
s = ''.join(open('.recon/static/' + f, encoding='utf-8', errors='ignore').read()
            for f in os.listdir('.recon/static') if f.endswith('.css'))
for sel in ['bg-subtle', 'bg-background', 'bg-action', 'bg-interaction', 'text-foreground', 'text-muted', 'text-subtle', 'border-line', 'bg-surface', 'bg-line', 'font-credit', 'bg-accent-muted', 'text-accent-deep', 'bg-accent', 'text-on-accent', 'text-accent']:
    hits = set()
    for m in re.finditer(r'\.' + re.escape(sel) + r'(?![\w-])[^{,]*\{([^}]*)\}', s):
        hits.add(' '.join(m.group(1).split()))
    print(sel, '=>', list(hits)[:3])

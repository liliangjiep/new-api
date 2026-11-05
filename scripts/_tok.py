# -*- coding: utf-8 -*-
import re, os, sys
s = ''.join(open('.recon/static/' + f, encoding='utf-8', errors='ignore').read()
            for f in os.listdir('.recon/static') if f.endswith('.css'))
names = sorted(set(re.findall(r'(--[a-z0-9-]+)\s*:', s)))
print(len(names))
for n in names:
    if n.startswith('--color') or n.startswith('--shadow') or n.startswith('--site') or n.startswith('--workspace'):
        print(n)

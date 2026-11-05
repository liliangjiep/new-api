# -*- coding: utf-8 -*-
import re, os
files = [f for f in os.listdir('.recon/static') if f.endswith('.css')]
for f in files:
    s = open('.recon/static/' + f, encoding='utf-8', errors='ignore').read()
    # find :root blocks
    for m in re.finditer(r'(:root|\[data-theme[^\]]*\])\s*\{([^}]*)\}', s):
        body = m.group(2)
        vals = dict(re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;]+)', body))
        if '--color-bg' in vals or '--color-text' in vals:
            print('===', f, m.group(1), len(vals))
            for k in sorted(vals):
                if any(x in k for x in ('color', 'shadow', 'font', 'radius', 'site-home')):
                    print('  ', k, '=', vals[k].strip())

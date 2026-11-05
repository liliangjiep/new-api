# -*- coding: utf-8 -*-
import re, glob
for f in sorted(glob.glob('.recon/full_orig_*.txt')):
    t = open(f, encoding='utf-8').read()
    print('==', f)
    for m in re.finditer(r'<h2 \[[^\]]*\] "([^"]*)" \.workspace-navigation-title', t):
        print('   nav title:', m.group(1))
    for m in re.finditer(r'<aside \[[^\]]*\] \.workspace-(pinned|floating)-navigation', t):
        print('   ', m.group(1))

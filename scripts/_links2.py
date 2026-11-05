import re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import glob, os
for f in sorted(glob.glob('.recon/ctx/orig_*.html')):
    h = open(f, encoding='utf-8', errors='replace').read()
    print(os.path.basename(f), sorted(set(re.findall(r'href="(/toolbox[^"]*)"', h))))

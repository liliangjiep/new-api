import re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_toolbox.html', encoding='utf-8', errors='replace').read()
print(sorted(set(re.findall(r'href="(/[^"]*)"', h))))

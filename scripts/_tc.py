import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_toolbox.html', encoding='utf-8', errors='replace').read()
for m in re.finditer(r'<p class="[^"]*toolbox-card-desc[^"]*"', h):
    print(m.group(0))
print('---card---')
for m in re.finditer(r'<a class="[^"]*toolbox-card[^"]*"', h):
    print(m.group(0)[:400])
print('---copy---')
for m in re.finditer(r'<div class="[^"]*toolbox-card-copy[^"]*"', h):
    print(m.group(0))

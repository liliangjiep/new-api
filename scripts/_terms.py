import re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_terms.html', encoding='utf-8', errors='replace').read()
i = h.find('<body')
seg = h[i:i+6000]
seg = re.sub(r'<script.*?</script>', '', seg, flags=re.S)
print(seg)

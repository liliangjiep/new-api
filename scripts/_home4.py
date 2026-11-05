import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_home_live.html', encoding='utf-8', errors='replace').read()
i = h.find('剪辑台')
print(h[max(0,i-2500):i+300])

import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_home_live.html', encoding='utf-8', errors='replace').read()
i = h.find('home-account-actions')
print(h[i-200:i+2500])

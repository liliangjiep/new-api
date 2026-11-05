import re, sys, html.parser
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = open('.recon/orig_notfound.html', encoding='utf-8', errors='replace').read()
i = s.find('<body')
print(s[i:i+4000])

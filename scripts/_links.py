import re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/ctx/orig_home.html', encoding='utf-8', errors='replace').read()
print(sorted(set(re.findall(r'href="(/[^"]*)"', h))))
for name in ['orig_toolbox.html', 'orig_toolbox-depth-video-clone.html']:
    try:
        t = open('.recon/ctx/%s' % name, encoding='utf-8', errors='replace').read()
    except FileNotFoundError:
        continue
    print(name, sorted(set(re.findall(r'href="(/[^"]*)"', t))))

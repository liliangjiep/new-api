import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
h = open('.recon/orig_home_live.html', encoding='utf-8', errors='replace').read()
for key in ['home-entry-scene-card', 'home-entry-scene-list', 'home-entry-scene-section']:
    i = h.find(key)
    print('###', key, i)
    print(h[max(0,i-300):i+700])
    print()

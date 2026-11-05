import sys, re, difflib, glob, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def toks(c):
    return sorted(c.split())

for f in sorted(glob.glob('.recon/clsord_*.txt')):
    print('###', os.path.basename(f))
    for line in open(f, encoding='utf-8').read().split('\n'):
        if not line.strip(): continue
        print('  ', ' '.join(toks(line))[:220])

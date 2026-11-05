import glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
needle = 'relative flex h-full min-h-0 min-w-0 flex-col lg:flex-1'
for f in sorted(glob.glob('.recon/ctx/orig_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    print(f.split('/')[-1], s.count(needle))
print('--- local ---')
for f in sorted(glob.glob('.recon/ctx/local_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    print(f.split('/')[-1], s.count(needle))

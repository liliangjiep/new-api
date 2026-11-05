import glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sorted(glob.glob('.recon/ctx/orig_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    print(f.split('/')[-1], 'aria-multiline:', s.count('aria-multiline'), 'textbox:', s.count('role="textbox"'))
print('--- local ---')
for f in sorted(glob.glob('.recon/ctx/local_*.html')):
    s = open(f, encoding='utf-8', errors='replace').read()
    print(f.split('/')[-1], 'aria-multiline:', s.count('aria-multiline'), 'textbox:', s.count('role="textbox"'))

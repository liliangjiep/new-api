import sys, glob, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
for f in glob.glob('docs/*.md'):
    print(os.path.basename(f))
    print(open(f, encoding='utf-8', errors='replace').read()[:3000])
    print('#'*60)

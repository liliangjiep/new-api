import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sys.argv[1:]:
    s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
    slides = re.findall(r'aria-label="(\d+ / \d+)"', s)
    print(f, len(slides), slides)

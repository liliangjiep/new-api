import re, collections, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pairs = [
 ('orig_toolbox-image-generation','local_toolbox-image-generation'),
 ('orig_toolbox-video-generation','local_toolbox-video-generation'),
]
for o, l in pairs:
    def get(f):
        s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
        return collections.Counter(re.findall(r'aria-label="([^"]{1,20})"', s))
    co, cl = get(o), get(l)
    print('==', o)
    print(' only orig:', sorted(set(co) - set(cl)))
    print(' only local:', sorted(set(cl) - set(co)))
    for k in sorted(set(co) & set(cl)):
        if co[k] != cl[k]:
            print('  count diff', k, co[k], cl[k])

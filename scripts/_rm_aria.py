import re

files = [
    'apps/web/src/app/toolbox/depth-video-clone/page.tsx',
    'apps/web/src/app/toolbox/ecommerce-image-set/page.tsx',
    'apps/web/src/app/toolbox/video-generation/page.tsx',
    'apps/web/src/app/toolbox/image-generation/page.tsx',
]
for f in files:
    s = open(f, encoding='utf-8').read()
    s2 = re.sub(r'\n\s*ariaLabel="[^"]*"', '', s, count=1)
    if s != s2:
        open(f, 'w', encoding='utf-8').write(s2)
        print('patched', f)

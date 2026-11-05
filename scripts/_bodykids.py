import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
i = s.find('<body')
j = s.find('>', i)
# naive: find top-level div starts by scanning
k = j + 1
depth = 0
import html.parser


class P(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.out = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        cls = (d.get('class') or '')[:70]
        self.out.append('  ' * self.depth + '<%s> %s' % (tag, cls))
        self.depth += 1

    def handle_endtag(self, tag):
        self.depth -= 1


p = P()
p.feed(s[i:])
for l in p.out[:60]:
    print(l)

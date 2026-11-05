import re, sys, io, html.parser
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = sys.argv[1]
s = open('.recon/ctx/%s.html' % f, encoding='utf-8', errors='replace').read()
i = s.find('<body')
j = s.find('>', i)


class P(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.out = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        cls = (d.get('class') or '')[:80]
        if self.depth <= 1:
            self.out.append((self.depth, tag, cls))
        self.depth += 1

    def handle_endtag(self, tag):
        self.depth -= 1


p = P()
p.feed(s[i:])
for d, tag, cls in p.out:
    print(' ' * d * 2, '<%s>' % tag, cls)

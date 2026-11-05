# -*- coding: utf-8 -*-
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
i = s.find(sys.argv[2]) if len(sys.argv) > 2 else 0
sec = s[i:]
pat = r'home-entry-tool-icon-box[^>]*>(.*?)</span><span class="home-entry-tool-name[^>]*>([^<]*)</span>'
for m in re.finditer(pat, sec, re.S):
    print('###', m.group(2))
    print(m.group(1))
    print()

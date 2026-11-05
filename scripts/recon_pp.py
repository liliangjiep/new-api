# -*- coding: utf-8 -*-
import re, sys

t = open(sys.argv[1], encoding="utf-8").read()
t = re.sub(r"(data:image/[^;]+;base64,)[A-Za-z0-9+/=]{20,}", r"\1<B64>", t)
t = re.sub(r"<img[^>]*/?>", "<img/>", t)
start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
end = int(sys.argv[3]) if len(sys.argv) > 3 else 3500
out = sys.argv[4] if len(sys.argv) > 4 else None
chunk = t[start:end]
if out:
    open(out, "w", encoding="utf-8").write(chunk)
else:
    sys.stdout.write(chunk)

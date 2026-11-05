import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
h = re.sub(r'class="[^"]*"', "", h)
h = re.sub(r'\s+', " ", h)
n = int(sys.argv[2]) if len(sys.argv) > 2 else 6000
off = int(sys.argv[3]) if len(sys.argv) > 3 else 0
print(h[off : off + n])

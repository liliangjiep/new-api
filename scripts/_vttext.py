# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for f in sys.argv[1:]:
    h = open(f, encoding="utf-8", errors="replace").read()
    print("==", f)
    for m in re.finditer(r'video-result-preview-idle-description[^>]*>([^<]*)<', h):
        print("  previewHint:", m.group(1))
    for m in re.finditer(r'class="mt-0.5 block truncate text-\[9px\] font-medium text-muted">([^<]*)<', h):
        print("  region coord:", m.group(1))
    i = h.find('操作指引')
    if i > 0:
        seg = h[i:i+14000]
        j = seg.find("</ol>")
        seg = seg[:j]
        for m in re.finditer(r'<p class="mt-0.5 text-\[10px\] leading-relaxed text-muted">([^<]*)<', seg):
            print("  stepdesc:", m.group(1))
        for m in re.finditer(r'class="mt-3 text-sm font-semibold text-foreground">([^<]*)<', h):
            print("  uploadTitle:", m.group(1))
        for m in re.finditer(r'class="mt-1 max-w-\[16rem\] text-\[11px\] font-medium leading-relaxed text-muted">([^<]*)<', h):
            print("  uploadHint:", m.group(1))

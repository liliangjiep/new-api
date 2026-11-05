import json, sys
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open(".recon/struct/orig_toolbox-depth-video-clone.json", encoding="utf-8"))
hits = []
for i, row in enumerate(d):
    if "generation-skill-panel" in row or "toolbox-editor-panel-root" in row or "depth-video-clone-editor" in row:
        hits.append((i, row[:150]))
print("HITS", len(hits))
for h in hits:
    print(h[0], h[1])

# -*- coding: utf-8 -*-
import os, sys, urllib.request
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
urls = {
    "ref-image.png": "https://daai-asset.da-ai.vip/users/00000000-0000-0000-0000-000000000001/assets/55edb902-d601-4f8c-8f69-551ed340fff8.png",
    "ref-character.png": "https://daai-asset.da-ai.vip/users/00000000-0000-0000-0000-000000000001/assets/cc623785-9876-4842-bba3-644f801ddf88.png",
    "ref-voice.png": "https://daai-asset.da-ai.vip/users/00000000-0000-0000-0000-000000000001/assets/48066eae-baf0-424e-b6ba-61887a01f71a.png",
}
out = "apps/web/public/toolboxs/depth-video-clone"
os.makedirs(out, exist_ok=True)
for name, url in urls.items():
    p = os.path.join(out, name)
    try:
        urllib.request.urlretrieve(url, p)
        print("ok", p, os.path.getsize(p))
    except Exception as e:
        print("ERR", name, e)

import json, os, sys, time, urllib.request, concurrent.futures

KEY = os.environ.get("TOAPIS_API_KEY") or "sk-cRkObYtBheM2iDGMWbVKou6SYhsd0aUu7zFKlmd8MpCN4nEB"
BASE = "https://toapis.cn"
OUT = r"D:\code\xin-ai\apps\web\public\toolboxs\depth-video-clone"

JOBS = [
    ("product.png", "E-commerce product reference slot placeholder: a clean studio shot of a rose lipstick box and a matching cream jar centered on a soft pale grey background, generous empty margin, top-down flat lay, soft diffused light, minimal e-commerce catalog placeholder, no text, 1:1"),
    ("person.png", "Model reference slot placeholder: a single full-body Chinese female fashion model standing centered against a soft pale grey studio background, neutral relaxed pose, plain light top and trousers, generous empty margin, soft diffused light, clean e-commerce catalog placeholder, no text, 1:1"),
    ("background.png", "Background reference slot placeholder: a clean empty modern studio corner with soft pale grey walls and a subtle floor gradient, no furniture, no people, generous empty margin, soft diffused light, minimal e-commerce catalog placeholder, no text, 1:1"),
]


def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def run(job):
    name, prompt = job
    dest = os.path.join(OUT, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 2000:
        return (name, "cached")
    try:
        t = post(f"{BASE}/v1/images/generations",
                 {"model": "gpt-image-2", "prompt": prompt, "size": "1:1", "resolution": "1k", "n": 1})
        tid = t.get("id")
        for _ in range(90):
            time.sleep(4)
            r = get(f"{BASE}/v1/images/generations/{tid}")
            if r.get("status") == "completed":
                url = r["result"]["data"][0]["url"]
                with urllib.request.urlopen(url, timeout=240) as resp:
                    data = resp.read()
                os.makedirs(OUT, exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(data)
                return (name, f"ok {len(data)//1024}KB")
            if r.get("status") == "failed":
                return (name, "FAILED")
        return (name, "timeout")
    except Exception as e:
        return (name, f"err {e}")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        for name, st in ex.map(run, JOBS):
            print(name, st, flush=True)

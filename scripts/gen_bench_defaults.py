#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""按原站默认图的「用途」重新生成我们自己的默认图（不复用原站素材）。
- 9 个商详套图模块缩略图 -> public/images/ec/mod-thumb-*.jpg   (1:1, 1K)
- 12 张商详套图参考示例 -> public/images/ec/ecommerce-detail-example-01..12.jpg (3:4, 2K)
- 18 套视频技能封面 -> public/images/gen/skill-video-*.jpg (3:2, 1K)
- 11 套图片技能封面 -> public/images/gen/skill-image-*.jpg (1:1, 1K)
"""
import json, os, sys, time, urllib.request, concurrent.futures

KEY = os.environ.get("TOAPIS_API_KEY") or "sk-cRkObYtBheM2iDGMWbVKou6SYhsd0aUu7zFKlmd8MpCN4nEB"
BASE = "https://toapis.cn"
WEB = r"D:\code\xin-ai\apps\web\public\images"

# 9 个模块缩略图：文件名 / 生成提示词
EC_MODULES = [
    ("primary-visual", "Ecommerce hero main visual thumbnail: a matte rose lipstick standing upright on a small white podium, pure seamless light background, soft top light, luxury minimal, photorealistic product photography, 1:1"),
    ("usage-scene", "Usage scene thumbnail: a hand holding a rose lipstick beside a vanity mirror in warm morning light, cosmetic usage moment, photorealistic lifestyle product photography, 1:1"),
    ("benefit-highlight", "Benefit highlight thumbnail: a frosted serum bottle with a glowing translucent droplet and fresh green leaves, luminous backlight, copy space, photorealistic product photography, 1:1"),
    ("material-detail", "Material detail macro thumbnail: extreme close-up of a brushed gold cap and glossy glass of a cosmetic bottle, micro surface variation, grazing light, tack sharp, photorealistic macro, 1:1"),
    ("package-unboxing", "Package unboxing thumbnail: an elegant gift box opened with tissue paper and a cosmetic set inside, warm daylight on a wooden table, photorealistic product photography, 1:1"),
    ("closing-cta", "Closing call-to-action thumbnail: a minimal cosmetic set on a warm gradient backdrop with generous empty space, soft shadow, premium photorealistic product photography, 1:1"),
    ("ingredient-formula", "Ingredient formula thumbnail: botanical extracts and golden droplets beside a frosted glass serum bottle on white stone, clean clinical still life, photorealistic, 1:1"),
    ("functional-structure", "Functional structure thumbnail: exploded view of a cosmetic bottle showing pump, glass and cap components separated, clean grey studio, technical photorealistic product rendering, 1:1"),
    ("pain-point-comparison", "Before-and-after comparison thumbnail: split frame of dull dry skin and glowing hydrated skin, neutral clean lighting, clinical honesty, photorealistic macro skin, 1:1"),
]

# 12 张参考示例（按原站示例顺序：首图/卖点/细节/成分/场景/结构/卖点/对比/场景/细节/包装/收尾）
EC_EXAMPLES = [
    ("ecommerce-detail-example-01", "首图 / 主视觉 — ecommerce hero shot, a matte lipstick on a mirrored acrylic block, seamless light grey backdrop, soft top softbox, contact shadow, luxury catalogue look, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-02", "卖点图 / 功效 — benefit shot, a drop of glowing serum suspended against a soft green gradient, botanicals blurred behind, copy space below, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-03", "细节图 / 材质 — macro, the metal collar and embossed logo of a cosmetic bottle, grazing side light revealing brushing, tack sharp, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-04", "成分图 / 配料 — ingredient shot, herbal extract drops and leaves beside a frosted serum bottle, clean clinical styling, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-05", "场景图 / 使用 — usage scene, a woman applying lip colour at a sunny window, natural expression, real skin texture, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-06", "结构图 / 功能 — structure shot, exploded cosmetic bottle showing pump, glass and cap, clean grey studio, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-07", "卖点图 / 功效 — tech-beauty benefit, light streaks around a glass dropper bottle on dark background, premium look, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-08", "对比图 / 痛点 — comparison portrait, split frame of tired dull skin and rested glowing skin of the same woman, consistent lighting, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-09", "场景图 / 使用 — lifestyle scene, a hand holding an amber serum bottle over a bathroom sink, morning light, lived-in details, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-10", "细节图 / 材质 — macro, cream texture swirl on a spatula with visible air bubbles, soft top light, true-to-life color, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-11", "包装图 / 到手 — packaging shot, an opened gift box with a thank-you card and cosmetics arranged, kraft paper, natural daylight, photorealistic, 3:4 vertical"),
    ("ecommerce-detail-example-12", "收尾图 / CTA — closing set shot, a curated cosmetic set on a warm beige gradient with empty copy space on the right, soft long shadow, photorealistic, 3:4 vertical"),
]

VIDEO_SKILLS = [
    ("ecommerce-spoken-selling", "Close-up talking-head e-commerce shot: a young Chinese female presenter in a light beige knit top at a minimalist product table, holding a cream skincare bottle near her face, speaking to camera, soft ring-light key from front-left, bright blurred studio background, photorealistic commercial still, 3:2"),
    ("ecommerce-promotion-conversion", "Promotional e-commerce studio scene: a hand holding a limited-edition gift box of cosmetics above a glowing pedestal, red and gold accent lighting, no readable text, shopping-festival mood, cinematic rim light, photorealistic commercial still, 3:2"),
    ("ecommerce-scene-seeding", "Lifestyle scene-seeding shot: a woman applying facial serum at a sunlit bathroom vanity with marble counter, morning window light, potted plant and folded towels, natural lived-in details, photorealistic commercial still, 3:2"),
    ("ecommerce-pain-point-solution", "Problem-solution beauty shot: a woman touching dry irritated forearm skin on one side and smooth glowing skin on the other, soft neutral bathroom light, clinical yet reassuring, photorealistic commercial still, 3:2"),
    ("ecommerce-function-demo", "Product function demo shot: hands demonstrating a compact powder case opening to reveal a mirror and pressed powder, macro detail of hinge and texture, bright even studio light, photorealistic commercial still, 3:2"),
    ("local-store-discovery", "Local boutique storefront discovery shot: a stylish small skincare shop facade with warm wood and brass details, open door with soft interior lighting, potted plants, golden hour street perspective, photorealistic commercial still, 3:2"),
    ("local-store-visit-record", "In-store visit documentary shot: a customer guided by a store associate toward a product shelf, candid handheld framing, mixed ceiling and daylight, real interior clutter, photorealistic commercial still, 3:2"),
    ("local-store-signature-experience", "Signature experience close-up: steaming ceramic pot of herbal soup with a wooden ladle on a dark stone counter, thin vapor rising, warm side light, photorealistic commercial still, 3:2"),
    ("local-store-group-buy-conversion", "Group-buy conversion scene: a smartphone held in hand showing a generic voucher card without readable text, in front of a lively local food shop counter, midday light, urgency mood, photorealistic commercial still, 3:2"),
    ("advertising-brand-proposition", "Brand proposition commercial shot: a minimalist studio set with a single sculptural glass perfume bottle on a raw concrete plinth, one directional shaft of light, negative space on the right for copy, muted premium palette, photorealistic TVC still, 3:2"),
    ("advertising-brand-story", "Brand story shot: an old family workshop table with handwritten ledgers, an artisan's hands working with clay and natural pigment, window light with dust motes, documentary warmth, photorealistic commercial still, 3:2"),
    ("advertising-lifestyle", "Lifestyle aspiration shot: a young couple in linen clothing making coffee in a bright modern apartment with plants and warm oak furniture, soft morning light through sheer curtains, photorealistic TVC still, 3:2"),
    ("advertising-creative-concept", "Creative concept shot: a cosmetic bottle floating over rippling still water with reflected caustic light, teal and warm amber palette, abstract composition with copy space, photorealistic commercial still, 3:2"),
    ("short-drama-dialogue", "Short-drama dialogue shot: two Chinese actors facing each other in a narrow apartment corridor, tense eye contact, one mid-gesture, cool practical hallway light mixed with warm room light, 35mm film look, photorealistic drama still, 3:2"),
    ("short-drama-reversal", "Short-drama reversal shot: a woman turning sharply in a dim bar with a surprised frozen expression, motion blur on the turn, moody teal and amber lighting, shallow depth of field, photorealistic drama still, 3:2"),
    ("short-drama-suspense", "Suspense short-drama shot: a shadowy figure partially visible behind frosted glass in an empty office at night, single cold light source, heavy negative space, 35mm film look, photorealistic drama still, 3:2"),
    ("short-drama-emotional", "Emotional short-film shot: a man in a rain-soaked jacket looking up at a lit apartment window, heavy rain streaks, warm window light against cold blue night, cinematic bokeh, photorealistic drama still, 3:2"),
    ("short-drama-product-placement", "Product placement drama shot: a character on a subway platform holding a skincare tube while a protagonist notices it, candid cinematic framing, natural transit lighting, photorealistic drama still, 3:2"),
]

IMAGE_SKILLS = [
    ("face-three-view", "Character reference sheet of one consistent Chinese female face shown as three clean head-and-shoulder views: front, full profile, three-quarter, neutral studio grey seamless background, even soft light, identical hairstyle and wardrobe, photorealistic, no text labels"),
    ("character-four-view", "Character turnaround sheet of one Chinese female model: three full-body front/side/back views plus one face close-up, plain light-grey studio background, soft even light, consistent proportions and outfit, photorealistic, no text labels"),
    ("model-face-swap", "Studio portrait of a Chinese fashion model wearing a beige wool coat, medium format 85mm lens, neutral expression, natural skin texture with visible pores, soft grey backdrop, photorealistic fashion photography, 1:1"),
    ("face-fusion", "Virtual avatar headshot of a Chinese woman with a soft blended facial identity, symmetrical neutral grey studio background, clean even lighting, natural pores and fine hair strands, photorealistic, no text"),
    ("clothing-tryon", "Full-body fashion shot of a Chinese model wearing a textured emerald knit sweater and wide-leg trousers in a minimal concrete studio, soft directional light, fabric weave and natural drape visible, photorealistic lookbook, 1:1"),
    ("product-usage", "A Chinese woman actually using a facial cream, dabbing product onto her cheek in a bright bathroom, mirror reflection partly visible, natural morning light, candid and unposed, photorealistic lifestyle product photography, 1:1"),
    ("product-white-bg", "Premium e-commerce white background product photo of a frosted glass serum bottle with a gold cap, pure seamless white background, soft gradient contact shadow, macro label texture, studio softbox lighting, catalog quality, photorealistic, 1:1"),
    ("garment-restyle", "Flat-lay studio photo of a folded linen shirt re-styled in a subtle herringbone ivory fabric, plain light surface, soft top light revealing weave, minimal premium e-commerce styling, photorealistic, no text, 1:1"),
    ("person-background-swap", "Chinese female model standing in a sunlit urban courtyard with brick walls and greenery, natural daylight, realistic edge separation and matched shadow direction, photorealistic street-style portrait, 1:1"),
    ("human-realism", "Documentary-style portrait of a Chinese office worker in her thirties, candid half-turn, natural skin with pores and slight under-eye texture, office corridor bokeh, soft window light, photorealistic, no beauty filter, 1:1"),
    ("image-refine", "High-resolution macro product still of a matte lipstick bullet on a dark stone slab with micro surface texture and true-to-life color, grazing light revealing the powdery finish, tack sharp, photorealistic, no text, 1:1"),
]

JOBS = []
for name, prompt in EC_MODULES:
    JOBS.append((os.path.join(WEB, "ec", f"mod-thumb-{name}.jpg"), prompt, "1:1", "1k"))
for name, prompt in EC_EXAMPLES:
    JOBS.append((os.path.join(WEB, "ec", f"{name}.jpg"), prompt, "3:4", "2k"))
for key, prompt in VIDEO_SKILLS:
    JOBS.append((os.path.join(WEB, "gen", f"skill-video-{key}.jpg"), prompt, "3:2", "1k"))
for key, prompt in IMAGE_SKILLS:
    JOBS.append((os.path.join(WEB, "gen", f"skill-image-{key}.jpg"), prompt, "1:1", "1k"))


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
    dest, prompt, size, res = job
    if os.path.exists(dest) and os.path.getsize(dest) > 2000:
        return (os.path.basename(dest), "cached")
    try:
        t = post(f"{BASE}/v1/images/generations",
                 {"model": "gpt-image-2", "prompt": prompt, "size": size, "resolution": res, "n": 1})
        tid = t.get("id")
        for _ in range(90):
            time.sleep(4)
            r = get(f"{BASE}/v1/images/generations/{tid}")
            if r.get("status") == "completed":
                url = r["result"]["data"][0]["url"]
                with urllib.request.urlopen(url, timeout=240) as resp:
                    data = resp.read()
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(data)
                return (os.path.basename(dest), f"ok {len(data)//1024}KB")
            if r.get("status") == "failed":
                return (os.path.basename(dest), "FAILED")
        return (os.path.basename(dest), "timeout")
    except Exception as e:
        return (os.path.basename(dest), f"err {e}")


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    jobs = [j for j in JOBS if not only or only in j[0]]
    print(f"total {len(jobs)} jobs", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        for name, st in ex.map(run, jobs):
            print(name, st, flush=True)

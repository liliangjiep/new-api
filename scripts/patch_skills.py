import io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.chdir(r"D:\code\xin-ai")

p = r"apps\web\src\app\toolbox\image-generation\page.tsx"
s = open(p, encoding="utf-8").read()
s = s.replace(
    '{ id: "image-refine", label: "图片精修", description: "修复画质、光影和清晰度", category: { key: "enhance", label: "增强" } },',
    '{ id: "image-refine", label: "图片精修", description: "修复画质、光影和清晰度", category: { key: "enhance", label: "增强" }, imageUrl: "/images/gen/skill-image-image-refine.jpg" },',
)
for k in ["face-three-view","character-four-view","model-face-swap","face-fusion","clothing-tryon",
          "product-usage","product-white-bg","garment-restyle","person-background-swap","human-realism"]:
    s = s.replace('{ id: "%s", label:' % k, '{ id: "%s", imageUrl: "/images/gen/skill-image-%s.jpg", label:' % (k, k))
open(p, "w", encoding="utf-8").write(s)

p = r"apps\web\src\app\toolbox\video-generation\page.tsx"
s = open(p, encoding="utf-8").read()
for k in ["ecommerce-spoken-selling","ecommerce-promotion-conversion","ecommerce-scene-seeding",
          "ecommerce-pain-point-solution","ecommerce-function-demo","local-store-discovery",
          "local-store-visit-record","local-store-signature-experience","local-store-group-buy-conversion",
          "advertising-brand-proposition","advertising-brand-story","advertising-lifestyle",
          "advertising-creative-concept","short-drama-dialogue","short-drama-reversal",
          "short-drama-suspense","short-drama-emotional","short-drama-product-placement"]:
    s = s.replace('{ id: "%s", label:' % k, '{ id: "%s", imageUrl: "/images/gen/skill-video-%s.jpg", label:' % (k, k))
open(p, "w", encoding="utf-8").write(s)
print("patched skills ok")

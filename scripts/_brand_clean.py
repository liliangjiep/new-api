import re, pathlib
p = pathlib.Path(r'D:\code\xin-ai\apps\web\src\app\page.tsx')
t = p.read_text(encoding='utf-8')
t2 = re.sub(r'video: "https://daai-asset[^"]+"', 'video: undefined', t)
p.write_text(t2, encoding='utf-8')
print('cleaned videos:', t2.count('video: undefined'))
print('daai left:', ('daai' in t2), ('da-ai' in t2))

import docx
d=docx.Document("deliverables/xin-ai-开发规格说明书-V1.docx")
print("PARAS:",len(d.paragraphs))
print("TABLES:",len(d.tables))
for i,p in enumerate(d.paragraphs[:400]):
    t=p.text.strip()
    if not t:
        continue
    try:
        style=p.style.name
    except Exception:
        style="?"
    print(f"P{i} [{style}] {t[:220]}")
print("==== TABLES ====")
for ti,t in enumerate(d.tables[:30]):
    print(f"-- TABLE {ti} {len(t.rows)}x{len(t.columns)}")
    for r in t.rows[:8]:
        cells=[]
        for c in r.cells:
            cells.append(c.text.strip().replace("\n","/")[:100])
        print(" | ".join(cells))

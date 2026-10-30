import docx
d=docx.Document("deliverables/xin-ai-开发规格说明书-V1.docx")
for ti in [4,30,31,32,33]:
    t=d.tables[ti]
    print(f"\n===== TABLE {ti} {len(t.rows)}x{len(t.columns)} =====")
    for ri,r in enumerate(t.rows):
        cells=[c.text.strip().replace("\n","/") for c in r.cells]
        print(f"R{ri}: {' || '.join(cells)}")

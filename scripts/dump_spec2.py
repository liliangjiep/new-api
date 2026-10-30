import docx
d=docx.Document("deliverables/xin-ai-开发规格说明书-V1.docx")
# dump TABLE 7 fully (index 7 in earlier? let's find by header)
for ti,t in enumerate(d.tables):
    # get first row text
    hdr=" | ".join(c.text.strip().replace("\n","/")[:30] for c in t.rows[0].cells)
    print(f"TABLE {ti} {len(t.rows)}x{len(t.columns)} HDR: {hdr}")
print("==== FULL DUMP of big tables ====")
for ti in [7,11,13,18,21,29]:
    if ti < len(d.tables):
        t=d.tables[ti]
        print(f"\n===== TABLE {ti} {len(t.rows)}x{len(t.columns)} =====")
        for ri,r in enumerate(t.rows):
            cells=[c.text.strip().replace("\n","/") for c in r.cells]
            print(f"R{ri}: {' || '.join(cells)}")
# dump chapter 13 paragraphs (P173-176 area) and surrounding
for i,p in enumerate(d.paragraphs):
    tx=p.text.strip()
    if not tx:
        continue
    if "降级" in tx or "P0" in tx or "P1" in tx or "P2" in tx or "不在" in tx or "不做" in tx or "变更" in tx or "二期" in tx:
        try:
            st=p.style.name
        except Exception:
            st="?"
        print(f"P{i} [{st}] {tx[:500]}")

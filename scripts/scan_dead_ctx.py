import re, pathlib
root = pathlib.Path(r"D:\code\xin-ai\apps\web\src")
files = list(root.rglob("*.tsx"))
out=[]
for f in files:
    lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
    text="\n".join(lines)
    for m in re.finditer(r"<button\b([^>]*?)>", text):
        attrs=m.group(1)
        has=("onClick" in attrs) or ("onMouse" in attrs) or ("onKey" in attrs) or ("onChange" in attrs) or ('type="submit"' in attrs)
        if not has:
            # compute line
            ln=text[:m.start()].count("\n")+1
            ctx="\n".join(f"{i+1:4}| {lines[i]}" for i in range(max(0,ln-4),min(len(lines),ln+8)))
            out.append(f"==== {f.relative_to(root)}:{ln} ====\n{ctx}\n")
open(r"D:\code\xin-ai\.recon\dead_buttons.txt","w",encoding="utf-8").write("\n".join(out))
print(f"wrote {len(out)}")

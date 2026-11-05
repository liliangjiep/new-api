import re, pathlib
root = pathlib.Path(r"D:\code\xin-ai\apps\web\src")
files = list(root.rglob("*.tsx"))
dead = []
for f in files:
    text = f.read_text(encoding="utf-8", errors="ignore")
    # find all <button ...>...</button> or self-closing? buttons rarely self-close
    for m in re.finditer(r"<button\b([^>]*?)>", text):
        attrs = m.group(1)
        # line number
        ln = text[:m.start()].count("\n")+1
        has = ("onClick" in attrs) or ("onMouse" in attrs) or ("onKey" in attrs) or ("onChange" in attrs) or ("type=\"submit\"" in attrs) or ("type='submit'" in attrs)
        # submit buttons inside forms are ok even without onClick
        aria = re.search(r'aria-label="([^"]*)"', attrs)
        label = aria.group(1) if aria else attrs.strip()[:90].replace("\n"," ")
        # ignore if disabled? no, still counts
        if not has:
            # check next 2000 chars for form submit context? just report
            dead.append((str(f.relative_to(root)), ln, label))
for rel, ln, label in dead:
    print(f"{rel}:{ln} :: {label}")
print(f"TOTAL_DEAD_BUTTONS={len(dead)} TOTAL_FILES={len(files)}")

import re, pathlib
root = pathlib.Path(r"D:\code\xin-ai\apps\web\src")
files = list(root.rglob("*.tsx"))
def find_tag_end(t, s):
    # s is index of "<button"
    i = s
    curly=0; ins=ind=False
    n=len(t)
    # skip "<button"
    j=s+7
    while j<n:
        c=t[j]
        if ins:
            if c=="'": ins=False
            j+=1; continue
        if ind:
            if c=='"': ind=False
            j+=1; continue
        if c=="'": ins=True
        elif c=='"': ind=True
        elif c=='{': curly+=1
        elif c=='}': curly=max(0,curly-1)
        elif c=='>' and curly==0:
            return j
        j+=1
    return -1
dead=[]
for f in files:
    t=f.read_text(encoding="utf-8",errors="ignore")
    for m in re.finditer(r"<button\b",t):
        e=find_tag_end(t,m.start())
        if e<0: continue
        attrs=t[m.start():e+1]
        has=("onClick" in attrs) or ("onMouse" in attrs) or ("onKey" in attrs) or ("onChange" in attrs) or ('type="submit"' in attrs) or ("type='submit'" in attrs)
        # Dropdown trigger button has onClick via parent div? check ThemeSwitcher trigger wrapped in div onClick
        if not has:
            ln=t[:m.start()].count("\n")+1
            am=re.search(r'aria-label="([^"]*)"',attrs)
            label=am.group(1) if am else attrs[:140].replace("\n"," ")
            dead.append((str(f.relative_to(root)),ln,label))
for rel,ln,label in dead:
    print(f"{rel}:{ln} :: {label[:120]}")
print(f"TOTAL_TRUE_DEAD={len(dead)}")

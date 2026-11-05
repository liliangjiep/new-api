import re, pathlib
root = pathlib.Path('apps/web/src')
issues=[]
for p in sorted(root.rglob('*.tsx')):
    t=p.read_text(encoding='utf-8', errors='ignore')
    for m in re.finditer(r'<button\b([^>]*)>', t):
        attrs=m.group(1)
        if 'onClick' in attrs: continue
        if 'onMouseEnter' in attrs: continue
        if 'aria-hidden' in attrs: continue
        if 'submit' in attrs: continue
        ln=t[:m.start()].count('\n')+1
        # find aria-label or text nearby
        context = t[m.start():m.start()+400].split('>')[1][:80] if '>' in t[m.start():m.start()+400] else ''
        snippet=re.sub(r'\s+',' ',attrs)[:160]
        issues.append(f'{p.relative_to(root)}:{ln} :: {snippet} :: inner={context[:60]}')
print(f'TOTAL suspicious buttons: {len(issues)}')
for s in issues[:120]:
    print(s)

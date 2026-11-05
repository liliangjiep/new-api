# -*- coding: utf-8 -*-
import io

p = "apps/web/src/components/features/PromptComposer.tsx"
s = io.open(p, encoding="utf-8").read()

pairs = [
    (
        '<section className="reference-slot-card group/reference-slot relative flex w-16 shrink-0 flex-col items-center">',
        '<section className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size,64px)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit">',
    ),
    (
        '<div className="reference-slot-card-stage pointer-events-none relative z-[1] size-16">',
        '<div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size,64px)] w-[var(--reference-slot-card-size,64px)] shrink-0">',
    ),
]
for o, n in pairs:
    c = s.count(o)
    print(f"{c}x {o[:70]}")
    s = s.replace(o, n)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")

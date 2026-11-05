# -*- coding: utf-8 -*-
import io, sys
p = "apps/web/src/app/toolbox/depth-video-clone/page.tsx"
s = io.open(p, encoding="utf-8").read()
pairs = [
    ('generation-skill-panel flex min-h-0', 'jsx-f5ae78e5cff69c4c generation-skill-panel flex min-h-0'),
    ('generation-skill-panel-header shrink-0', 'jsx-f5ae78e5cff69c4c generation-skill-panel-header shrink-0'),
    ('generation-skill-panel-title-row flex items-center', 'jsx-f5ae78e5cff69c4c generation-skill-panel-title-row flex items-center'),
    ('generation-skill-panel-title-copy flex min-w-0', 'jsx-f5ae78e5cff69c4c generation-skill-panel-title-copy flex min-w-0'),
    ('generation-skill-panel-title text-[15px]', 'jsx-f5ae78e5cff69c4c generation-skill-panel-title text-[15px]'),
    ('generation-skill-panel-subtitle whitespace-nowrap', 'jsx-f5ae78e5cff69c4c generation-skill-panel-subtitle whitespace-nowrap'),
    ('generation-skill-content min-h-0', 'jsx-f5ae78e5cff69c4c generation-skill-content min-h-0'),
    ('generation-skill-grid grid grid-cols-2', 'jsx-f5ae78e5cff69c4c generation-skill-grid grid grid-cols-2'),
    ('generation-skill-card group relative min-w-0', 'jsx-f5ae78e5cff69c4c generation-skill-card group relative min-w-0'),
    ('generation-skill-card-select relative z-[1]', 'jsx-f5ae78e5cff69c4c generation-skill-card-select relative z-[1]'),
    ('generation-skill-card-title block truncate', 'jsx-f5ae78e5cff69c4c generation-skill-card-title block truncate'),
    ('generation-skill-card-desc line-clamp-2', 'jsx-f5ae78e5cff69c4c generation-skill-card-desc line-clamp-2'),
    ('generation-skill-card-check pointer-events-none', 'jsx-f5ae78e5cff69c4c generation-skill-card-check pointer-events-none'),
]
for a, b in pairs:
    if a not in s:
        print("MISS:", a)
    s = s.replace(a, b)
io.open(p, "w", encoding="utf-8").write(s)
print("done")

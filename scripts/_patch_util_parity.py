# -*- coding: utf-8 -*-
"""对齐 globals.css 里语义工具类与原站 susu.da-ai.cc 的逐值一致性。"""
import io

p = "apps/web/src/app/globals.css"
s = io.open(p, encoding="utf-8").read()

pairs = [
    (
        """  .bg-bg {
    background-color: hsl(var(--background));
  }
  .bg-bg-subtle {
    background-color: hsl(var(--bg-subtle));
  }
  .bg-bg-action {
    background-color: hsl(var(--bg-action));
  }
  .bg-bg-subtle-action {
    background-color: hsl(var(--bg-subtle-action));
  }
""",
        "",
    ),
    (
        """  .bg-surface-2 {
    background-color: hsl(var(--surface-2));
  }
  .bg-surface-3 {
    background-color: hsl(var(--surface-3));
  }
""",
        "",
    ),
    (
        """  .bg-subtle {
    background-color: hsl(var(--bg-subtle));
  }
""",
        """  .bg-subtle {
    background-color: hsl(var(--bg-subtle));
  }
  .bg-subtle-action {
    background-color: hsl(var(--bg-subtle-action));
  }
""",
    ),
]
for o, n in pairs:
    if o not in s:
        print("!! NOT FOUND:", o[:60].replace("\n", " "))
        continue
    s = s.replace(o, n)
    print("ok:", o[:60].replace("\n", " "))

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("done")

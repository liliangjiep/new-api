# -*- coding: utf-8 -*-
"""把原站 canvas 系列 token 补进 globals.css :root（实测值逐字对齐）。"""
import io

p = "apps/web/src/app/globals.css"
s = io.open(p, encoding="utf-8").read()

anchor = """  /* 原站滚动条 */
  --color-scrollbar: rgb(0 0 0 / 0.1);
  --color-scrollbar-hover: rgb(0 0 0 / 0.2);
"""

addition = anchor + """
  /* 原站画布（canvas）token —— 实测 .recon/static/0ecfcdcb7ef126e0.css :root */
  --canvas-bg: #12171a;
  --canvas-bg-deep: #0d1114;
  --canvas-surface: rgb(255 255 255 / 0.08);
  --canvas-surface-strong: rgb(255 255 255 / 0.12);
  --canvas-line: rgb(39 59 80 / 0.14);
  --canvas-text: rgb(25 38 54 / 0.92);
  --canvas-text-muted: rgb(71 89 111 / 0.72);
  --canvas-text-toolbar: color-mix(
    in srgb,
    var(--canvas-text) 68%,
    var(--canvas-text-muted) 32%
  );
"""

assert anchor in s, "anchor not found"
s = s.replace(anchor, addition, 1)
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")

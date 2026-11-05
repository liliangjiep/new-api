# -*- coding: utf-8 -*-
"""把原站 class 逐字回填到我们组件里（用于 1:1 复刻对齐）。"""
import io, sys

EDITS = {
    "apps/web/src/components/features/PromptComposer.tsx": [
        # reference-slot-trigger：原站 bg-subtle（非 bg-bg-subtle），带 group-hover 边框
        (
            'className="reference-slot-trigger absolute inset-0 overflow-hidden rounded-xl border border-line bg-bg-subtle shadow-sm transition-colors"',
            'className="reference-slot-trigger absolute inset-0 overflow-hidden rounded-xl border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999]"',
        ),
        # speech-input-controls-microphone：原站 touch-manipulation + hover:bg-[#f1f1f1]
        (
            'className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-none items-center justify-center rounded-full text-muted transition-colors hover:bg-muted"',
            'className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"',
        ),
        # prompt-reference-bottom-action：原站带 :has() 隐藏规则
        (
            '<div className="prompt-reference-bottom-action flex min-w-0 shrink-0 items-center gap-2 px-3">',
            '<div className="prompt-reference-bottom-action flex min-w-0 shrink-0 items-center gap-2 px-3 [&:has([data-speech-active=true])_.prompt-reference-char-count]:hidden [&:has([data-speech-active=true])_.prompt-reference-action]:hidden">',
        ),
        # prompt-editor-shell：原站带 [&::-webkit-scrollbar]:hidden
        (
            'className="prompt-editor-shell relative flex flex-1 flex-col overflow-hidden pb-2.5 [scrollbar-width:none] [-ms-overflow-style:none]"',
            'className="prompt-editor-shell relative flex flex-1 flex-col overflow-hidden pb-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"',
        ),
        # SelectorTrigger：原站 text-foreground + hover:bg-surface/90
        (
            '"toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-foreground shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface/90 data-[open=true]:border-line-strong data-[open=true]:bg-surface/90"',
            '"toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-foreground shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface/90 data-[open=true]:border-line-strong data-[open=true]:bg-surface/90"',
        ),
    ],
    "apps/web/src/components/features/PopoverSelect.tsx": [
        (
            '"toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-fg shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface-2 data-[open=true]:border-line-strong data-[open=true]:bg-surface-2",',
            '"toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-foreground shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface/90 data-[open=true]:border-line-strong data-[open=true]:bg-surface/90",',
        ),
    ],
    "apps/web/src/components/features/SkillSelector.tsx": [
        # 原站 generation-skill-trigger 带 px-0 + 渐变背景 + disabled 态
        (
            '"bg-[linear-gradient(to_right,var(--color-bg-subtle-action)_44px,transparent_100%)]",',
            '"bg-[linear-gradient(to_right,var(--color-bg-subtle-action)_44px,transparent_100%)]",',
        ),
    ],
}

for path, pairs in EDITS.items():
    s = io.open(path, encoding="utf-8").read()
    for o, n in pairs:
        c = s.count(o)
        if c == 0:
            print(f"!! NOT FOUND in {path}: {o[:70]}")
            continue
        if o == n:
            print(f"== skip (same) {path}: {o[:60]}")
            continue
        s = s.replace(o, n)
        print(f"ok {c}x {path}: {o[:60]}")
    io.open(path, "w", encoding="utf-8", newline="").write(s)
print("done")

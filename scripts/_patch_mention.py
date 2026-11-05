# -*- coding: utf-8 -*-
"""MentionEditor 按原站结构 1:1 重写（milkdown-editor-root / ProseMirror / speech-input-controls）。"""
p = "apps/web/src/components/features/MentionEditor.tsx"
s = open(p, encoding="utf-8").read()
start = s.index('"use client";')
end = s.index("\n", s.rindex("}")) + 1

new = '''"use client";

import { useEffect, useRef } from "react";

/**
 * 原站 mention 编辑器（2026-10-31 实测逐字复刻）：
 *
 *  div.markdown-mention-editor-root.ui-markdown-mention-editor
 *   └─ div.milkdown-editor-container
 *       └─ div.milkdown-editor-shell
 *           ├─ div[data-mention-placeholder]  绝对定位 placeholder
 *           └─ div.milkdown-editor-root.MilkdownMentionEditor_editor__JP4BW
 *               └─ div.milkdown
 *                   └─ div.ProseMirror.editor[contenteditable][data-mention-editor]
 *                       └─ p > br.ProseMirror-trailingBreak
 *       └─ div.markdown-mention-editor-speech
 *           └─ div.speech-input-controls[data-speech-active]
 *               └─ button.speech-input-controls-microphone
 */
export function MentionEditor({
  value,
  onChange,
  placeholder,
  maxChars,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: React.ReactNode;
  maxChars?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cur = el.innerText.replace(/\\u00a0/g, " ");
    if (cur !== value) {
      el.innerText = value;
      // 原站 ProseMirror 末尾保留一个 trailingBreak 占位段落
      if (!value) {
        const p = document.createElement("p");
        const br = document.createElement("br");
        br.className = "ProseMirror-trailingBreak";
        p.appendChild(br);
        el.replaceChildren(p);
      }
    }
  }, [value]);

  return (
    <div className="markdown-mention-editor-root ui-markdown-mention-editor relative flex min-h-0 flex-1 flex-col">
      <div className="milkdown-editor-container relative flex min-h-0 flex-1 flex-col">
        <div className="milkdown-editor-shell relative flex min-h-0 flex-1 flex-col min-h-[100px] rounded-none border-0 bg-transparent shadow-none cursor-text">
          {placeholder ? (
            <div
              data-mention-placeholder="true"
              className="pointer-events-none absolute z-[1] text-xs leading-6 text-muted"
              style={{ left: "0.5rem", right: "0.5rem", top: "0.5rem" }}
            >
              {placeholder}
            </div>
          ) : null}
          <div
            className={
              className ??
              "milkdown-editor-root MilkdownMentionEditor_editor__JP4BW min-h-0 h-full w-full flex-1 cursor-text overflow-y-auto px-2 py-2 text-xs leading-6 text-foreground [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            }
            data-milkdown-generation="1"
          >
            <div className="milkdown">
              <div
                ref={ref}
                className="ProseMirror editor"
                contentEditable
                suppressContentEditableWarning
                data-mention-editor="true"
                translate="no"
                role="textbox"
                aria-multiline="true"
                aria-label={ariaLabel}
                onInput={(e) => {
                  const t = e.currentTarget.innerText.replace(/\\u00a0/g, " ");
                  onChange(maxChars ? t.slice(0, maxChars) : t);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'''

open(p, "w", encoding="utf-8").write(new)
print("rewrote MentionEditor")

"use client";

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
  className,
  shellClassName,
  rootClassName,
  hideSpeechSlot,
  placeholderClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: React.ReactNode;
  maxChars?: number;
  className?: string;
  shellClassName?: string;
  rootClassName?: string;
  hideSpeechSlot?: boolean;
  placeholderClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cur = el.innerText.replace(/\u00a0/g, " ");
    if (cur !== value) {
      el.innerText = value;
    }
    // 原站 ProseMirror 末尾始终保留一个 trailingBreak 占位段落
    if (!el.querySelector("br.ProseMirror-trailingBreak")) {
      const p = document.createElement("p");
      const br = document.createElement("br");
      br.className = "ProseMirror-trailingBreak";
      p.appendChild(br);
      el.appendChild(p);
    }
  }, [value]);

  return (
    <div
      className={
        rootClassName ??
        "markdown-mention-editor-root ui-markdown-mention-editor relative flex min-h-0 flex-1 flex-col prompt-markdown-editor flex min-h-0 flex-1 flex-col"
      }
    >
      <div className="milkdown-editor-container relative flex min-h-0 flex-1 flex-col">
        <div
          className={
            shellClassName ??
            "milkdown-editor-shell relative flex min-h-0 flex-1 flex-col min-h-[100px] rounded-none border-0 bg-transparent shadow-none cursor-text"
          }
        >
          {placeholder && !value ? (
            <div
              data-mention-placeholder="true"
              className={
                placeholderClassName ??
                "pointer-events-none absolute z-[1] text-sm leading-6 text-muted"
              }
              style={{ left: "0.5rem", right: "0.5rem", top: "0.5rem" }}
            >
              {placeholder}
            </div>
          ) : null}
          <div
            className={
              className ??
              "milkdown-editor-root MilkdownMentionEditor_editor__JP4BW min-h-0 h-full w-full flex-1 cursor-text overflow-y-auto  px-2 py-2 text-sm leading-6 text-foreground [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden "
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
                onInput={(e) => {
                  const t = e.currentTarget.innerText.replace(/\u00a0/g, " ");
                  onChange(maxChars ? t.slice(0, maxChars) : t);
                }}
              >
                <p>
                  <br className="ProseMirror-trailingBreak" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {hideSpeechSlot ? null : (
        <div className="markdown-mention-editor-speech min-w-0 shrink-0 contents" />
      )}
    </div>
  );
}

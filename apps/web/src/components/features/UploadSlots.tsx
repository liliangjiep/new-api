"use client";

import { useRef, useState } from "react";
import { Upload, X, FileVideo, FileImage, FileAudio } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/domain";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  kind: "image" | "video" | "audio";
  previewUrl?: string;
  status: "uploading" | "done" | "error";
  progress: number;
}

/**
 * 参考素材上传槽位
 * 两段式直传：先取 upload-policy → 直传 OSS → complete 回调
 * TODO(API): 接后端 /assets/upload-policy 与 /assets/complete
 */
export function UploadSlots({
  label,
  accept,
  max,
  multiple = true,
  hint,
  value,
  onChange,
}: {
  label: string;
  accept: string;
  max: number;
  multiple?: boolean;
  hint?: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const room = max - value.length;
    const incoming = Array.from(fileList).slice(0, room);
    const next: UploadedFile[] = incoming.map((f, i) => ({
      id: `tmp_${Date.now()}_${i}`,
      name: f.name,
      size: f.size,
      kind: f.type.startsWith("video")
        ? "video"
        : f.type.startsWith("audio")
          ? "audio"
          : "image",
      previewUrl: f.type.startsWith("image") ? URL.createObjectURL(f) : undefined,
      status: "uploading",
      progress: 0,
    }));
    onChange([...value, ...next]);

    // TODO(API): 换成真实上传 + 进度回调
    next.forEach((f) => {
      let p = 0;
      const timer = setInterval(() => {
        p += 20;
        if (p >= 100) {
          clearInterval(timer);
          onChange((prev) =>
            prev.map((x) =>
              x.id === f.id ? { ...x, status: "done", progress: 100 } : x
            )
          );
        } else {
          onChange((prev) =>
            prev.map((x) => (x.id === f.id ? { ...x, progress: p } : x))
          );
        }
      }, 120);
    });
  };

  const remove = (id: string) =>
    onChange((prev) => prev.filter((f) => f.id !== id));

  const full = value.length >= max;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <span className="tabular text-[11px] text-fg-subtle">
          {value.length} / {max}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!full) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border border-dashed p-3 transition-colors",
          dragging
            ? "border-accent bg-accent-soft/40"
            : "border-line bg-surface-2/50",
          full && "opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            if (!full) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={full}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 py-4 text-center disabled:cursor-not-allowed"
        >
          <Upload className="size-4 text-fg-subtle" aria-hidden />
          <span className="text-xs text-fg-muted">
            {full ? "槽位已满" : "点击上传或拖拽到此处"}
          </span>
          {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
        </button>
      </div>

      {value.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((f) => (
            <li
              key={f.id}
              className="group relative overflow-hidden rounded-sm border border-line bg-surface-2"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-3">
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.previewUrl}
                    alt={f.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <KindIcon kind={f.kind} />
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] text-fg-muted">
                  {f.name}
                </span>
                <span className="tabular shrink-0 text-[10px] text-fg-subtle">
                  {formatBytes(f.size)}
                </span>
              </div>
              {f.status === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-3">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(f.id)}
                aria-label={`移除 ${f.name}`}
                className="absolute right-1 top-1 rounded-xs bg-bg/80 p-1 text-fg-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: UploadedFile["kind"] }) {
  const cls = "size-5 text-fg-subtle";
  if (kind === "video") return <FileVideo className={cls} aria-hidden />;
  if (kind === "audio") return <FileAudio className={cls} aria-hidden />;
  return <FileImage className={cls} aria-hidden />;
}

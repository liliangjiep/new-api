"use client";

import { useState } from "react";
import {
  PANEL,
  PANEL_BODY,
  PANEL_CONTENT,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PopoverSelect } from "@/components/features/PopoverSelect";
import { useToast } from "@/components/features/ToastHost";

/**
 * 原站三个视频处理工具共用骨架（实测 /toolbox/video-quality-enhance 等）：
 *  面板头：返回 + 新建
 *  上传区：整块可点的虚线上传框（标题 + 格式说明）
 *  参数区：若干 Popover 选择器（h-52px）
 *  操作指引 region：编号步骤
 *  提交条：开始增强 预计 -- 积分
 *  中栏 Tabs：仅「预览」
 */
export function BenchVideoProcessTool({
  title,
  uploadTitle,
  uploadHint,
  cta,
  steps,
  controls,
  previewHint,
}: {
  title: string;
  uploadTitle: string;
  uploadHint: string;
  cta: string;
  steps: string[];
  controls?: React.ReactNode;
  previewHint: string;
}) {
  const { push } = useToast();
  const [uploaded, setUploaded] = useState(false);
  const [tab, setTab] = useState("preview");
  const [busy, setBusy] = useState(false);

  const go = () => {
    if (!uploaded) {
      push({ tone: "warning", title: "请先上传视频" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      push({ tone: "success", title: "已提交", description: title });
    }, 1500);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className={PANEL_HEADER}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{title}</span>
                <button
                  type="button"
                  onClick={() => setUploaded(false)}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent"
                  aria-label="新建"
                >
                  新建
                </button>
              </div>
            </div>

            <div className={`${PANEL_BODY} flex flex-col gap-3`}>
              {/* —— 上传区 —— */}
              <button
                type="button"
                onClick={() => setUploaded(true)}
                className="flex w-full shrink-0 flex-col items-center gap-1 rounded-xl border border-dashed border-line bg-surface px-3 py-10 text-xs text-muted"
              >
                <span className="font-medium text-foreground">
                  {uploaded ? "已上传 video.mp4" : uploadTitle}
                </span>
                <span className="text-[11px]">{uploadHint}</span>
              </button>

              {/* —— 参数区 —— */}
              {controls}

              {/* —— 操作指引 —— */}
              <section aria-label="操作指引" className="shrink-0 rounded-xl border border-line bg-surface-2 p-3">
                <h3 className="text-xs font-medium text-foreground">操作指引</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-muted">
                  {steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="sticky bottom-0 z-[2] shrink-0">
              <SubmitBar
                label={cta}
                credits={uploaded ? 12 : null}
                disabled={!uploaded}
                loading={busy}
                onClick={go}
              />
            </div>
          </div>
        </div>
      }
      preview={
        <PreviewPanel
          tabs={[
            {
              key: "preview",
              label: "预览",
              panel: (
                <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center text-xs text-muted">
                  {previewHint}
                </div>
              ),
            },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      }
      queue={
        <QueuePanel>
          <ul className="space-y-2">
            <li className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-xs text-muted">
              还没有任务。处理完成后，结果会出现在这里。
            </li>
          </ul>
        </QueuePanel>
      }
    />
  );
}

/* —— 视频画质增强 —— */
export function QualityEnhanceTool() {
  const [version, setVersion] = useState("大模型版");
  const [spec, setSpec] = useState("分辨率与补帧");
  return (
    <BenchVideoProcessTool
      title="视频画质增强"
      uploadTitle="上传视频"
      uploadHint="支持 5 分钟以内的 mp4 / mov / avi 等格式"
      cta="开始增强"
      previewHint="处理完成后会在这里预览增强后的视频。"
      steps={[
        "上传视频：点击画面中央上传，支持 5 分钟以内的 mp4 / mov 等格式。",
        "选择目标画质：根据原视频分辨率选择更高一档的输出规格。",
        "开始增强：确认积分消耗后提交，画质增强将提升视频清晰度。",
      ]}
      controls={
        <section aria-label="增强参数" className="grid shrink-0 grid-cols-2 gap-2">
          <PopoverSelect
            label="版本"
            value={version}
            onChange={setVersion}
            ariaLabel="版本"
            className="min-w-0"
            options={[
              { value: "大模型版", label: "大模型版", description: "画质最佳，速度较慢" },
              { value: "极速版", label: "极速版", description: "速度优先" },
            ]}
          />
          <PopoverSelect
            label="分辨率与补帧"
            value={spec}
            onChange={setSpec}
            ariaLabel="分辨率与补帧"
            align="end"
            className="min-w-0"
            options={[
              { value: "分辨率与补帧", label: "分辨率与补帧" },
              { value: "1080P · 30fps", label: "1080P · 30fps" },
              { value: "2K · 60fps", label: "2K · 60fps" },
              { value: "4K · 60fps", label: "4K · 60fps" },
            ]}
          />
        </section>
      }
    />
  );
}

/* —— 视频字幕擦除 —— */
export function SubtitleEraseTool() {
  return (
    <BenchVideoProcessTool
      title="视频字幕擦除"
      uploadTitle="上传视频"
      uploadHint="支持 30 秒以内的 mp4 / mov / avi 等格式"
      cta="开始擦除"
      previewHint="上传视频后在这里预览并框选字幕区域。"
      steps={[
        "上传视频：点击画面中央上传，支持 30 秒以内的 mp4 / mov 等格式。",
        "框选字幕：在视频预览上拖拽描框，覆盖字幕所在区域。",
        "微调区域：拖动框体可平移，拖动四角手柄可调整大小。",
        "开始擦除：确认积分消耗后提交，系统将自动去除框内字幕。",
      ]}
    />
  );
}

/* —— 视频去水印 —— */
export function WatermarkRemoveTool() {
  const [regions, setRegions] = useState<string[]>(["1: 左上 78,4 · 右下 96,14"]);
  return (
    <BenchVideoProcessTool
      title="视频去水印"
      uploadTitle="上传视频"
      uploadHint="支持 30 秒以内的 mp4 / mov / avi 等格式； 超过 2K（长边 2048）将自动压缩至 2K 后处理"
      cta="开始去水印"
      previewHint="上传视频后在这里预览并框选水印区域。"
      steps={[
        "上传视频：点击画面中央上传，支持 30 秒以内的 mp4 / mov 等格式。",
        "框选水印：在视频预览上拖拽描框，可连续标定多个水印或 logo。",
        "微调区域：点击区域后可平移，拖动四角手柄可调整大小。",
        "开始去水印：确认积分消耗后提交，系统将修复框内画面。",
      ]}
      controls={
        <section aria-label="水印区" className="shrink-0 space-y-2">
          {regions.map((r, i) => (
            <div key={r} className="flex items-center gap-2">
              <button type="button" className="flex-1 rounded-lg border border-line px-2 py-1.5 text-left text-[11px]">
                水印区 {r}
              </button>
              <button
                type="button"
                disabled={regions.length <= 1}
                onClick={() => setRegions((p) => p.filter((_, j) => j !== i))}
                className="rounded-lg border border-line px-2 py-1.5 text-[11px] disabled:opacity-40"
              >
                删除区域 {i + 1}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRegions((p) => [...p, `${p.length + 1}: 左上 20,20 · 右下 40,30`])}
            className="w-full rounded-lg border border-dashed border-line px-2 py-1.5 text-[11px] text-muted"
          >
            新增水印区
          </button>
        </section>
      }
    />
  );
}

"use client";

/**
 * 语音输入 —— 真实闭环：浏览器录音 → 上传资产库 → 后端转写 → 回填文本。
 * 行内注释1：为什么之前是 toast 演示 ——
 *             后端 POST /speech-input/transcribe 早就存在，但前端从没调用过，
 *             三处语音按钮（PromptComposer / 首页 / 工具页）全是 toast 占位。
 * 行内注释2：降级要诚实 ——
 *             ASR 属于 A 类（需要语音服务凭据），未接入时后端明确返回
 *             available=false，这里据此提示「语音识别暂不可用，请改用文字输入」，
 *             绝不让用户以为「识别成功但结果是空的」。
 * 行内注释3：录音用 MediaRecorder —— 浏览器原生，无需额外依赖；
 *             不支持时（http 非 localhost / 老浏览器）直接禁用按钮并说明原因。
 */

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { uploadAsset } from "@/lib/backend/assets";
import { transcribe } from "@/lib/backend/agent";

export type SpeechPhase = "idle" | "recording" | "uploading" | "transcribing";

export interface SpeechInputState {
  phase: SpeechPhase;
  /** 浏览器是否支持录音 —— 不支持时按钮应禁用。 */
  supported: boolean;
  /** 开始录音。 */
  start: () => Promise<void>;
  /** 停止录音并完成转写，命中后回调 text。 */
  stop: (onText: (text: string) => void) => Promise<void>;
}

export function useSpeechInput(): SpeechInputState {
  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      setPhase("recording");
    } catch {
      // 麦克风被拒或设备不可用 —— 明确告知，不假装在录音。
      cleanup();
      setPhase("idle");
      throw new Error("无法访问麦克风，请检查浏览器权限");
    }
  }, [supported, cleanup]);

  const stop = useCallback(
    async (onText: (text: string) => void) => {
      const rec = recorderRef.current;
      if (!rec) return;
      const mime = rec.mimeType || "audio/webm";
      const blob = await new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
        rec.stop();
      });
      cleanup();
      setPhase("uploading");
      try {
        const file = new File([blob], `speech-${Date.now()}.webm`, { type: mime });
        const asset = await uploadAsset(file, "配音");
        setPhase("transcribing");
        const res = await transcribe(asset.id);
        if (!res.available) {
          throw new Error(res.message || "语音识别服务尚未接入，请改用文字输入");
        }
        if (res.text?.trim()) {
          onText(res.text);
        }
      } finally {
        setPhase("idle");
      }
    },
    [cleanup],
  );

  return { phase, supported, start, stop };
}

/** 把 ApiError 消息抽出来给 toast 用。 */
export function speechErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "语音输入失败，请改用文字输入";
}

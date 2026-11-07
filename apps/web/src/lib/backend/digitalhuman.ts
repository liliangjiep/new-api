/**
 * 数字人链路封装（真调用）。
 * 行内注释1：形象走 /avatars（标准化后才能提交口播），音频走 /tts/jobs 或上传素材。
 * 行内注释2：口播/改口型任务统一走 /digital-human/jobs，返回统一任务对象。
 */

import { api } from "@/lib/api";
import type { TaskRecord } from "@/lib/backend/tasks";

export interface AvatarRecord {
  id: string;
  name: string;
  url: string;
  standardized: boolean;
}

/** 形象列表。 */
export async function listAvatars(standardizedOnly = false): Promise<AvatarRecord[]> {
  return api.get("/avatars", { standardizedOnly });
}

/** 新建形象 —— asset_id 必须是本人已上传的素材。 */
export async function createAvatar(body: { asset_id: string; name?: string }): Promise<AvatarRecord> {
  return api.post("/avatars", body);
}

/** 标准化形象 —— 之后才能用于口播任务。 */
export async function standardizeAvatar(id: string): Promise<AvatarRecord> {
  return api.post(`/avatars/${id}/standardize`);
}

/** 音色列表。 */
export async function listVoices(): Promise<
  Array<{ id: string; name: string; source: string; created_at: string }>
> {
  return api.get("/voices");
}

/** 克隆音色。 */
export async function cloneVoice(body: { name: string; audio_asset_ids: string[] }): Promise<{
  id: string;
  name: string;
  source: string;
}> {
  return api.post("/voices", body);
}

/** 音色槽位列表。 */
export async function listVoiceSlots(): Promise<
  Array<{ id: string; voice_id: string; name: string; index: number }>
> {
  return api.get("/voice-slots");
}

/** 新建音色槽位。 */
export async function createVoiceSlot(body: {
  voice_id: string;
  name: string;
  index: number;
}): Promise<{ id: string; voice_id: string; name: string; index: number }> {
  return api.post("/voice-slots", body);
}

/** 语音合成任务 —— 文案转音频，返回统一任务对象。 */
export async function submitTts(body: { text: string; voice_id?: string }): Promise<TaskRecord> {
  return api.post("/tts/jobs", body);
}

/**
 * 数字人口播 / 改口型任务。
 * 行内注释3：mode 传「口播」走 image-speak.60s，传「改口型」走 lipsync.volc.1min。
 */
export async function submitDigitalHumanJob(body: {
  avatar_id: string;
  audio_asset_id?: string;
  tts_text?: string;
  script?: string;
  mode?: string;
}): Promise<TaskRecord> {
  return api.post("/digital-human/jobs", body);
}

/** 授权文件列表。 */
export async function listAuthorizations(): Promise<
  Array<{ id: string; type: string; subject: string; file_url: string; status: string }>
> {
  return api.get("/authorizations");
}

/** 登记授权文件。 */
export async function createAuthorization(body: {
  type: string;
  subject: string;
  file_url: string;
}): Promise<{ id: string; type: string; status: string }> {
  return api.post("/authorizations", body);
}

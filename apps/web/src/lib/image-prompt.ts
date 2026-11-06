import { IMAGE_SKILLS } from "./domain";

/**
 * 专业生图提示词组装（规则见 docs/prompt-image-v1.md）
 * 六段式：场景/材质 → 主体+缺陷 → 光 → 机位 → 禁令
 * 用户只填主体描述，模板自动拼接硬约束，保证“去 AI 味”。
 */

/**
 * 14 场景专业提示词母版（英文完整版见 docs/prompt-image-v1.md §B+）
 * {stone} 由材质锚定（主色+纹理描述）替换；前端展示用中文简写，后端/批量提交用英文母版。
 */
export const STONE_SCENE_PROMPTS: Record<string, string> = {
  lobby:
    "Ultra-photorealistic hotel lobby, double-height atrium, {stone} full-height feature wall with continuous bookmatched veins wrapping around corners, brushed brass inlay strips, mirror-polished floor with soft reflections, warm 3000K cove lighting + daylight from entrance glazing, people-free, 24mm tilt-shift f/8, straight verticals. No CGI look, no repeating veins, no watermark, no text.",
  banquet:
    "Ultra-photorealistic column-free banquet hall, {stone} clad columns with vertical vein flow, warm dimmable chandeliers + wall washers, carpet with subtle pattern, evening event-ready ambiance, empty tables with white linen, 35mm f/5.6 eye-level wide. No plastic texture, no flat lighting, no people, no watermark, no text.",
  reception:
    "Photorealistic hotel reception, {stone} reception counter front with waterfall edge + backlit logo wall in same stone, oak slat backdrop, pendant cluster, warm spot accents, shallow depth of field on stone texture foreground, 50mm f/4. No fake marble, no watermark, no text on signage.",
  elevator:
    "Photorealistic elevator lobby, {stone} portal frames with mitered edges, honed finish, downlight grid reflected in polished floor, brushed stainless elevator doors centered, symmetrical composition, 35mm f/8. No repeating pattern, no overexposed highlights, no people, no watermark, no text.",
  guestroom:
    "Photorealistic luxury hotel bedroom, {stone} headboard wall with soft backlight cove, linen bedding with natural wrinkles, walnut nightstands, warm 2700K reading sconces, morning daylight through sheer curtains, 35mm f/4 eye-level. Keep fabric creases, no watermark, no text.",
  courtyard:
    "Photorealistic stone courtyard at golden hour, {stone} stepping pavers over still water, moss in joints, soft ripples reflecting sky, bamboo planting blurred background, low-angle 35mm f/5.6, warm backlight + cool shadow fill. No plastic water, no watermark, no text.",
  club:
    "Ultra-photorealistic private club lounge, {stone} bar front with dramatic veining + leather upholstered stools, walnut shelving with bottles softly blurred, moody low-key lighting with brass pendants, 50mm f/2.8. No HDR excess, no watermark, no text.",
  exhibit:
    "Photorealistic stone showroom corridor, full-height {stone} display walls with sequential slabs showing vein continuity, museum track spots 4000K, polished concrete floor, perspective leading lines, people-free, 24mm tilt-shift f/8. No repeating slabs, no watermark, no text.",
  facade:
    "Photorealistic building facade, dry-hung {stone} panels with open joints and shadow gaps, late-afternoon raking light revealing panel flatness variation, glass curtain wall contrast, street-level 35mm f/8. No warped geometry, no watermark, no text.",
  paving:
    "Photorealistic plaza paving, {stone} radial/modular pattern with slip-resistant honed finish, wet-look reflections after rain, fallen leaves for scale, oblique 35mm f/5.6. Show joint alignment precision. No repeating texture tiles, no watermark, no text.",
  wall:
    "Ultra-photorealistic living room TV wall, floor-to-ceiling dry-hung {stone} with bookmatched mirror veins centered on TV axis, hidden LED cove top and bottom, low-profile oak console, afternoon daylight from left window + global illumination, 35mm f/4. Veins must continue across panel joints. No CGI look, no fake marble, no watermark, no text.",
  feature:
    "Photorealistic sofa backdrop wall, {stone} with horizontal vein flow + concealed light band at dado height, boucle fabric sofa with natural creases, travertine side table, warm floor lamp glow, 50mm f/4 shallow depth. No flat lighting, no watermark, no text.",
  vanity:
    "Photorealistic bathroom vanity close-up, {stone} countertop with waterfall side + integrated backsplash upstand, undermount basin, brushed gold faucet, backlit round mirror, morning window light + soft fill, macro 50mm f/5.6. Show stone edge thickness and mitre detail. No watermark, no text.",
  stairs:
    "Photorealistic staircase, {stone} treads with integrated risers (one-piece L-shape), anti-slip grooves near nosing, recessed LED footlights washing each tread, dark steel balustrade, dramatic side raking light, low-angle 35mm f/5.6. Show nosing shadow line and joint precision. No people, no watermark, no text.",
};

/** 用材质锚定组装某场景的最终提交 prompt */
export function buildStoneScenePrompt(sceneKey: string, stoneDesc: string, extra = ""): string {
  const tpl = STONE_SCENE_PROMPTS[sceneKey] ?? STONE_SCENE_PROMPTS.wall;
  const stone = stoneDesc.trim() || "white marble with grey veins, polished";
  return tpl.replace("{stone}", stone) + (extra.trim() ? ` Additional notes: ${extra.trim()}` : "");
}
export function buildImagePrompt(skillKey: string, userInput: string): string {
  const tpl =
    IMAGE_SKILLS.find((s) => s.key === skillKey)?.promptTemplate ?? "{user}";
  const user = userInput.trim();
  if (!user) return "";
  return tpl.replace("{user}", user);
}

/** 给批量出图脚本 / 后端用的同款模板导出（key → 模板） */
export function getPromptTemplate(skillKey: string): string {
  return (
    IMAGE_SKILLS.find((s) => s.key === skillKey)?.promptTemplate ?? "{user}"
  );
}

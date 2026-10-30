# xin-ai 生图提示词规范 V1（ToAPI gpt-image-2 专用）

> 来源：OpenAI《Image prompting》《GPT Image Models Prompting Guide》+ ArchSynth 建筑摄影 prompt 实践 + 本项目“去 AI 味”硬约束。
> 目标：人像 / 效果图 / 材质 / 特写四类出图**看起来像真实拍摄**，不是干净死板的 AI 成图。
> 生图前必读本文件；所有技能包 prompt 模板、前端示例图、批量出图都按此执行。

## 1. 通用六段式（顺序固定）

```
[场景/环境 + 材质细节] → [主体 + 自然缺陷] → [动作/表情/状态] → [光源方向与质感] → [机位/镜头/构图] → [硬约束/禁令]
```

- 场景：说清地点、时间、氛围，不要只写主体（如“ minimalist Tokyo apartment at 4PM on an overcast day”而不是“a woman”）。
- 主体：必须带**自然缺陷**——毛孔、细纹、碎发、矿物杂色、抛光不均、布料褶皱。完美=假。
- 光：点名光源+方向+质感（如“single soft window light from camera left”“warm daylight from right window + bounce”）。
- 机位：镜头+光圈+构图（如“50mm f/1.8, eye-level, shallow depth of field”“35mm f/4, eye-level wide”）。
- 硬约束：见 §4，每类必带。

## 2. 四类模板

### A. 专业人像（数字人形象 / 讲解员 / 创始人）

```
Photorealistic candid portrait, {年龄+身份+自然特征：visible pores, slight under-eye texture, a few flyaway hairs, natural freckles if any},
{服装材质细节：cotton weave, slight wrinkles at collar}, {表情动作：looking slightly off-camera / gentle smile, relaxed shoulders},
{single soft window light from camera left, realistic eye reflections, soft shadow falloff},
shot on Sony A7IV with 85mm f/1.8, shallow depth of field, background softly blurred,
subtle film grain, true-to-life color, no retouching.
硬约束：no plastic skin, no beauty filter, no over-smoothing, no extra fingers, no watermark, no text, photorealistic, indistinguishable from real photo.
```

参考你的写法再加一段“缺陷锚点”：美颜柔化可以，但**中间调保留细颗粒+少量彩噪**，拒绝“处处锐利”。

### B. 空间效果图（客厅 / 展厅 / 石材场景）

```
Ultra-photorealistic architectural interior photograph, {空间类型+时间}, {石材名+纹理走向+bookmatched对缝+抛光/哑光+微观起伏},
{家具布料纹理+金属反射+木纹}, {natural daylight from {方向} window + global illumination + soft contact shadows + ambient occlusion},
shot on full-frame camera, {35mm for wide / 50mm for detail}, f/4-f/8, balanced exposure, natural white balance, subtle depth of field,
magazine-quality (Architectural Digest editorial).
硬约束：no CGI look, no plastic texture, no repeating vein pattern, no flat lighting, no overexposed highlights, no watermark, no text.
```

石材必填：大板连续纹（veins wrap around corners, not tiled）、矿物云雾、抛光高光滚降（highlight rolloff）、接触阴影。

### B+. 石材厂家常用 14 场景专业提示词（与 stone-effect 页 14 模板一一对应）

> 用法：`{stone}` = 材质锚定描述（如 "Calacatta white marble, bookmatched grey veins, polished"），`{user}` 追加客户补充。size 统一 16:9，resolution 2k（交付 4k 可选）。每条已按 ArchSynth 实践写死光位/机位/材质锚点，直接拼即可。

**酒店公区（5）**

1. 酒店大堂 lobby —— `Ultra-photorealistic hotel lobby, double-height atrium, {stone} full-height feature wall with continuous bookmatched veins wrapping around corners, brushed brass inlay strips, mirror-polished floor with soft reflections of wall, warm 3000K cove lighting + daylight from entrance glazing, people-free, shot on full-frame 24mm tilt-shift f/8, straight verticals, Architectural Digest editorial. No CGI look, no repeating veins, no watermark, no text.`
2. 宴会厅 banquet —— `Ultra-photorealistic column-free banquet hall, {stone} clad columns with vertical vein flow, warm dimmable chandeliers + wall washers, carpet with subtle pattern, evening event-ready ambiance, empty tables with white linen, shot on 35mm f/5.6 eye-level wide, balanced exposure. No plastic texture, no flat lighting, no people, no watermark, no text.`
3. 前台接待 reception —— `Photorealistic hotel reception, {stone} reception counter front with waterfall edge + backlit logo wall in same stone, oak slat backdrop, pendant cluster above, warm spot accents, shallow depth of field on stone texture foreground, shot on 50mm f/4. No fake marble, no watermark, no text on signage (leave blank).`
4. 电梯厅 elevator —— `Photorealistic elevator lobby, {stone} portal frames with mitered edges, honed finish to hide fingerprints, downlight grid reflected in polished floor, brushed stainless elevator doors centered, symmetrical composition, shot on 35mm f/8. No repeating pattern, no overexposed highlights, no people, no watermark, no text.`
5. 客房 guestroom —— `Photorealistic luxury hotel bedroom, {stone} headboard wall with soft backlight cove, linen bedding with natural wrinkles, walnut nightstands, warm 2700K reading sconces, morning daylight through sheer curtains, shot on 35mm f/4 eye-level. No CGI bedding perfection, keep fabric creases, no watermark, no text.`

**商业与外立面（5）**

6. 庭院 courtyard —— `Photorealistic stone courtyard at golden hour, {stone} stepping pavers over still water, moss in joints, soft ripples reflecting sky, bamboo planting blurred background, low-angle shot on 35mm f/5.6, warm backlight + cool shadow fill. No plastic water, no watermark, no text.`
7. 会所 club —— `Ultra-photorealistic private club lounge, {stone} bar front with dramatic veining + leather upholstered stools, walnut shelving with bottles softly blurred, moody low-key lighting with brass pendants, cigar-smoke-free clean air, shot on 50mm f/2.8. No HDR excess, no watermark, no text.`
8. 展厅 exhibit —— `Photorealistic stone showroom corridor, full-height {stone} display walls with sequential slabs showing vein continuity, museum track spots 4000K, polished concrete floor, perspective leading lines, people-free, shot on 24mm tilt-shift f/8. No repeating slabs, no watermark, no text.`
9. 幕墙 facade —— `Photorealistic building facade, dry-hung {stone} panels with open joints and shadow gaps, late-afternoon raking light revealing panel flatness variation, glass curtain wall contrast, street-level eye view on 35mm f/8. Day version: blue sky + soft clouds. Night version: warm interior glow through glass + facade uplights. No warped geometry, no watermark, no text.`
10. 地面铺装 paving —— `Photorealistic plaza paving, {stone} radial / modular pattern with slip-resistant honed finish, wet-look reflections after rain, fallen leaves for scale, top-down oblique drone-like 35mm f/5.6. Show joint alignment precision. No repeating texture tiles, no watermark, no text.`

**住宅部件（4）**

11. 墙面干挂 wall —— `Ultra-photorealistic living room TV wall, floor-to-ceiling dry-hung {stone} with bookmatched mirror veins centered on TV axis, hidden LED cove top and bottom, low-profile oak console, afternoon daylight from left window + global illumination, shot on 35mm f/4. Veins must continue across panel joints. No CGI look, no fake marble, no watermark, no text.`
12. 背景墙 feature —— `Photorealistic sofa backdrop wall, {stone} with horizontal vein flow + concealed light band at dado height, boucle fabric sofa with natural creases, travertine side table, warm floor lamp glow, shot on 50mm f/4 shallow depth. No flat lighting, no watermark, no text.`
13. 洗手台 vanity —— `Photorealistic bathroom vanity close-up, {stone} countertop with waterfall side + integrated backsplash upstand, undermount basin, brushed gold faucet with realistic water-spot-free reflections, backlit round mirror, morning window light + soft fill, macro 50mm f/5.6. Show stone edge thickness and mitre detail. No watermark, no text.`
14. 楼梯踏步 stairs —— `Photorealistic staircase, {stone} treads with integrated risers (one-piece L-shape), anti-slip grooves near nosing, recessed LED footlights washing each tread, dark steel balustrade, dramatic side raking light, low-angle 35mm f/5.6. Show nosing shadow line and joint precision. No people, no watermark, no text.`

卖点话术挂钩（厂家销售可直接用）：大堂讲“整面通纹对缝”、前台讲“瀑布边+透光”、干挂讲“纹路居中对电视轴线”、楼梯讲“踢踏一体无断缝”、幕墙讲“干挂留缝+光影平整度”。

### C. 材质纹理（大理石 / 洞石 / 样砖）

```
Extreme close-up / flat-lay product photography of {石材名+纹理+表面处理}, {纹理细节：large organic veins / pits / mineral clouding, micro surface variation, subtle polish inconsistency, soft radiused edges},
{neutral daylight, grazing light to reveal texture}, macro lens, f/8, tack sharp on texture, shallow falloff at edges,
subtle film grain, true-to-life color.
硬约束：no repeating pattern, no texture-mapped look, no plastic, no watermark, no text.
```

### D. 商业特写（洗手台 / 楼梯 / 工艺 / 麦克风）

```
Documentary product still life, {主体+材质+使用痕迹：slight wear, dust, fingerprints}, {环境虚化交代场景},
{directional daylight + bounce, realistic reflections/refraction, ray-traced global illumination},
shot on Canon EOS R5, 50mm f/2.8, subject in focus, background softly blurred, natural imperfections.
硬约束：no staged studio polish, no HDR excess, no watermark, no text.
```

## 3. 负面词库（按类拼到硬约束后）

- 人像：`no plastic skin, no beauty filter, no over-smoothing, no glamorization, no extra fingers, no distorted hands, no watermark, no text, no logo`
- 效果图：`no CGI look, no flat lighting, no plastic texture, no repeating veins, no fake marble, no altered geometry, no watermark, no text`
- 材质：`no repeating pattern, no texture-mapped appearance, no flat stone, no watermark, no text`
- 通用：`photorealistic, real photograph, taken on a real camera, indistinguishable from real photo`

## 4. 参数建议（gpt-image-2）

| 用途 | size | resolution | 说明 |
|------|------|-----------|------|
| 人像/形象照 | 1:1 | 2k | 面部特写用 2k；全身 1k 即可 |
| 效果图宽幅 | 16:9 / 3:2 | 2k | 展厅/客厅用 16:9；交付 4k 可选 |
| 材质纹理 | 1:1 | 2k | 微观细节需要 2k |
| 缩略图/封面 | 1:1 / 4:3 | 1k | 列表页够用，最便宜 $0.015 |

`background=transparent` 仅图标/抠图类用，照片类不要。

## 5. 在本项目的位置

- 本文件：`docs/prompt-image-v1.md`（规则唯一源；§B+ 为 stone-effect 页 14 模板的专业提示词母版）。
- 前端图片生成页：`apps/web/src/app/toolbox/image-generation/page.tsx` —— 11 个 `IMAGE_SKILLS` 每个挂一个 `promptTemplate`（按 §2 四类套），提交时自动拼接硬约束，用户只填主体描述。
- 石材效果图页：`apps/web/src/app/toolbox/stone-effect/page.tsx` —— `SCENE_GROUPS` 14 模板的 `prompt` 字段是 §B+ 的中文简写；后端/批量出图按 §B+ 英文母版拼 `{stone}` 材质锚定后提交。
- 批量出图脚本：按本文件 §2 写 prompt，输出落 `apps/web/public/images/toapi/*.png`，记录到 `docs/toapi-queue.md`。

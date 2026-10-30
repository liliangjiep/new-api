/* eslint-disable */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, HeadingLevel, TableOfContents,
  TabStopType, TabStopPosition,
} = require("docx");

const CW = 9638; // content width DXA (A4, 2cm margins)
// 统一范围定义（与《功能拆分报价单 V4》共用同一份数据，避免两份文档口径不一致）
const { BLOCKS, BLOCK_E, TOTALS, RATE: DAY_RATE, OPTIONAL_IDS, OPTIONAL_MD } = require("./_scope.js");
const FONT = "微软雅黑";
const ACCENT = "0F5F73";
const ACCENT2 = "E8F1F3";

const border = { style: BorderStyle.SINGLE, size: 2, color: "B8C6CC" };
const borders = { top: border, bottom: border, left: border, right: border };
const CELLM = { top: 60, bottom: 60, left: 110, right: 110 };

function t(text, opts = {}) {
  return new TextRun({ text: String(text), font: FONT, size: opts.size || 20, bold: !!opts.bold, color: opts.color, italics: !!opts.italics });
}

function P(text, opts = {}) {
  const { children, ...rest } = opts;
  return new Paragraph({
    children: children || [t(text, opts)],
    spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: opts.line ?? 300 },
    alignment: opts.align,
    indent: opts.indent,
    pageBreakBefore: opts.pageBreakBefore,
    border: opts.border,
    keepNext: opts.keepNext,
  });
}

function H(text, level = 1, opts = {}) {
  const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
  return new Paragraph({
    heading: map[level],
    pageBreakBefore: !!opts.pageBreakBefore,
    spacing: { before: level === 1 ? 320 : 240, after: 140 },
    children: [new TextRun({ text, font: FONT, bold: true, color: level === 1 ? ACCENT : "1F3D47", size: level === 1 ? 30 : level === 2 ? 25 : 22 })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bul", level },
    spacing: { after: 60, line: 290 },
    children: [t(text)],
  });
}

function num(text) {
  return new Paragraph({ numbering: { reference: "num", level: 0 }, spacing: { after: 60, line: 290 }, children: [t(text)] });
}

function cell(content, opts = {}) {
  const paras = Array.isArray(content)
    ? content
    : [new Paragraph({ spacing: { after: 0, line: 260 }, alignment: opts.align, children: [t(content, { bold: opts.bold, size: opts.size || 18, color: opts.color })] })];
  return new TableCell({
    borders,
    width: { size: opts.w, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: CELLM,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.span,
    children: paras,
  });
}

function T(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const w = widths.map((x) => Math.round((x / total) * CW));
  w[w.length - 1] = CW - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const head = new TableRow({
    tableHeader: true,
    children: headers.map((hh, i) => cell(hh, { w: w[i], bold: true, fill: ACCENT, color: "FFFFFF", align: AlignmentType.CENTER })),
  });
  const body = rows.map((r, ri) =>
    new TableRow({
      children: r.map((c, i) => {
        if (c && typeof c === "object" && c.__p) {
          return new TableCell({ borders, width: { size: w[i], type: WidthType.DXA }, margins: CELLM, shading: ri % 2 ? { fill: "F6FAFB", type: ShadingType.CLEAR } : undefined, columnSpan: c.span, children: c.__p });
        }
        return cell(c, { w: w[i], fill: ri % 2 ? "F6FAFB" : undefined });
      }),
    })
  );
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: w, rows: [head, ...body] });
}

const P_ = (text, o = {}) => ({ __p: [new Paragraph({ spacing: { after: 0, line: 260 }, children: [t(text, o)] })] });

function money(n) {
  return "¥" + Number(n).toLocaleString("zh-CN");
}

function pct(a, b) {
  return b === 0 ? "-" : Math.round(((a - b) / a) * 100) + "%";
}

// ---------- shared document scaffolding ----------
function baseDoc(children, title, subtitle) {
  return new Document({
    creator: "技术方案组",
    title,
    description: subtitle,
    styles: {
      default: { document: { run: { font: FONT, size: 20 }, paragraph: { spacing: { line: 300 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 25, bold: true, font: FONT, color: "1F3D47" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: FONT, color: "2B5563" }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 20, bold: true, font: FONT, color: "40555E" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u25CF", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 240 } } } }, { level: 1, format: LevelFormat.BULLET, text: "\u25CB", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 840, hanging: 240 } } } }] },
        { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 240 } } } }] },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 600, footer: 600 } },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } },
              children: [t(title, { size: 16, color: "6B7F87" })],
              spacing: { after: 0 },
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [t("第 ", { size: 16, color: "8A9AA0" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A9AA0", font: FONT }), t(" 页 / 共 ", { size: 16, color: "8A9AA0" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "8A9AA0", font: FONT }), t(" 页", { size: 16, color: "8A9AA0" })],
            })],
          }),
        },
        children,
      },
    ],
  });
}

function cover(title, subtitle, metaRows, docCode, date, version = "V1.0") {
  return [
    new Paragraph({ spacing: { before: 1200, after: 0 }, alignment: AlignmentType.CENTER, children: [t(title, { size: 44, bold: true, color: ACCENT })] }),
    new Paragraph({ spacing: { before: 120, after: 600 }, alignment: AlignmentType.CENTER, children: [t(subtitle, { size: 22, color: "4A6570" })] }),
    T(["项目", "内容"], metaRows, [26, 74]),
    new Paragraph({ spacing: { before: 500, after: 0 }, alignment: AlignmentType.CENTER, children: [t(`文档编号：${docCode}    编制日期：${date}    版本：${version}`, { size: 18, color: "7A8C93" })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/* =========================================================================
   DOC 1 : 开发规格说明书
   ========================================================================= */
function buildDevDoc() {
  const c = [];
  c.push(...cover(
    "AI 视频创作平台 开发规格说明书",
    "含积分计费体系、模型供应链、石材行业专属能力",
    [
      ["项目名称", "AI 视频与商品图生成平台 · 全量复刻 + 石材行业专属模块"],
      ["文档类型", "软件开发规格说明书 / 技术方案（平台方内部执行文档）"],
      ["版本", "V4.0"],
      ["适用范围", "客户方项目立项、开发、验收、运维交接"],
      ["文档编号", "SPEC-AIVC-2026-004"],
      ["编制日期", "2026-10-29"],
    ],
    "SPEC-AIVC-2026-004", "2026-10-29", "V4.0"
  ));

  c.push(H("目录", 1));
  c.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));
  c.push(new Paragraph({ children: [new PageBreak()] }));

  // 1
  c.push(H("1. 文档说明与项目目标", 1));
  c.push(H("1.1 编写目的", 2));
  c.push(P("本文档是本项目的开发执行依据，用于明确：①系统范围与功能边界；②前后端工程规范与接口契约；③积分计费规则与模型成本口径；④AI 能力的实现链路与降级策略；⑤石材行业专属功能的实现方式；⑥交付物、验收标准与工期节点。开发过程中如需变更，须走第 15 章的变更流程并同步更新本文档版本号。"));
  c.push(H("1.2 项目背景与定位", 2));
  c.push(P("xin.ai 是平台方自营的 AI 内容生产平台（对标 DAAI / susu.da-ai.cc 的功能形态），商业模式为「用户充值积分 → 按生成消耗积分」。与对外定制开发不同，本平台由平台方自行运营、自担成本、自享收益，因此本章定位与后续所有成本、验收、运维口径均以「自营」为准：模型成本由平台方通过中转站统一采购并计入积分定价的成本口径；售价积分在后台可配，随成本波动与竞品策略动态调整。"));
  c.push(H("1.3 建设目标", 2));  c.push(bullet("业务目标：用户可自助完成「上传素材 → 选择工作流 → 生成 → 下载 → 分享/投放」的完整闭环，无需人工介入。"));
  c.push(bullet("商业目标：积分充值 + 套餐赠送 + 发票 + 联盟分销，形成可持续的现金流结构；模型成本通过中转站集中采购压低，毛利最大化。"));
  c.push(bullet("技术目标：模型层与业务层解耦，任意模型可热切换与灰度，不因换供应商而改动业务代码；供应商接入点全部配置化，中转站与官方直连可随时互换。"));
  c.push(bullet("交付目标：按阶段拆分交付，每阶段独立可上线运营、独立可验收，避免一次性交付 287 人天范围带来的进度与质量风险。"));
  c.push(bullet("行业目标：在通用能力之上，交付石材行业专属链路（石材空间效果图、石材场景模板、厂家介绍视频），形成差异化。"));

  c.push(H("1.4 范围界定", 2));
  c.push(P("本项目范围严格限定为 https://susu.da-ai.cc/ 站点的前后端功能复刻，及其上新增的石材行业模块，并在此基础上接入模型中转站供应链。除此之外的系统均不在本项目范围内。"));
  c.push(T(
    ["范围", "内容"],
    [
      ["在范围内", "susu.da-ai.cc 门户首页、工具箱与 9 个工具页、画布编辑器、Agent 对话与 Agent Cloud、素材资产库、账号与 RBAC、积分计费与充值支付、发现流、管理后台 20 个页签、联盟分销、发票、推荐与公告"],
      ["在范围内", "石材行业增量：石材材质库、上传石材图生成空间效果图、14 类石材场景模板、材质一致性校验与人工精修、上传数字人形象生成厂家介绍视频、石材脚本与提示词模板库"],
      ["不在范围内", "短信 / 彩信群发系统、SIM 卡池、设备串口与 AT 指令、Modem 硬件调度等硬件侧系统（属另一独立产品线）"],
      ["不在范围内", "本项目之外的其他软件项目；原站私有部署环境与历史业务数据（本项目为新建系统，仅提供用户数据导入模板与脚本）"],
    ],
    [14, 86]
  ));

  c.push(H("2. 对标平台逆向基线（真实功能与真实模型）", 1));
  c.push(P("本项目的功能范围与模型选型不是凭空设计，而是对 https://da-ai.cc/（DAAI 电商视频与商品图生成平台）做了完整的生产环境逆向后确定。逆向时间 2026-10-29。逆向的意义：客户看到的每一项功能、每一个模型、每一个价格口径，都有出处，不会在接单后发现「报价里的模型根本不存在」或「做出来的功能对标站根本没有」。"));
  c.push(H("2.1 逆向方法与产出证据", 2));
  c.push(T(
    ["逆向手段", "具体操作", "产出证据"],
    [
      ["静态资源枚举", "抓取首页 HTML，提取 45 个 Next.js 静态 chunk（总计约 4.0 MB）并全量下载", "完整前端源码级逻辑、模型键常量、选项数组、路由表"],
      ["生产接口直连", "调用站点公开接口 GET /api/v1/model-routes/public、/api/v1/tools/、/api/v1/video-creator/skills、/api/v1/public/settings、/api/v1/discover/home 等", "站点实时启用的 20 个模型键、13 个能力域、折扣率、19 套视频技能包定义"],
      ["CDP 运行时观测", "启动独立 Chrome 实例（9222 端口），经 REA 工具做 DOM/资源/网络被动观测，渲染并快照各功能页", "首页、工具箱、数字人、视频生成、画布、后台等页面的真实交互结构与操作指引文案"],
      ["路由穷举探测", "对 13 个候选路由发起 HTTP 请求并核对页面 title", "确认 /toolbox/digital-human 等全部路由真实存在（title 返回「数字人 · DAAI」等）"],
      ["供应商价格实测", "抓取 Kie.ai 市场页与各模型详情页、阿里百炼官方文档、fal.ai 模型页、火山方舟文档", "第 8.3 节与第 9.1 节全部成本数字的原始出处"],
    ],
    [18, 46, 36]
  ));
  c.push(H("2.2 逆向确认的站点真实模型栈", 2));
  c.push(P("下列 20 个模型键为站点 GET /api/v1/model-routes/public 接口当前实际返回的启用项，我方按同一清单复刻，不做删减也不做臆造。"));
  c.push(T(
    ["能力域", "模型键（logical_model_key）", "显示名", "供应通道", "折扣率"],
    [
      ["text", "text.standard", "标准版智能对话", "多模型路由", "1.00"],
      ["video", "video.seedance_2_5", "Seedance 2.5", "bytedance / wan / kling / minimax", "1.00"],
      ["video", "video.standard", "Seedance-2.0-VIP", "volc", "1.00"],
      ["video", "video.fast_vip", "Seedance-2.0-Fast-VIP", "volc", "0.75"],
      ["video", "video.mini", "Seedance-2.0-Mini-VIP", "volc", "0.50"],
      ["video", "video.wan_3_0", "Wan 3.0", "wan", "0.90"],
      ["video", "video.wan_3_0_prime", "Wan 3.0 Prime", "wan", "0.90"],
      ["video", "video.kling_4_0", "Kling 4.0", "kling", "0.85"],
      ["video", "video.kling_4_0_omni", "Kling 4.0 Omni", "kling", "0.85"],
      ["video", "video.minimax_h3 / _max", "MiniMax H3 / H3 Max", "minimax", "1.00"],
      ["image", "image.premium_2_5_pro", "LC Image 2.5 Pro", "kie", "1.00"],
      ["image", "image.premium_2_5_fast", "LC Image 2.5 Fast", "kie", "1.00"],
      ["image", "image.premium / _vip", "高级版 / 高级版 VIP", "kie", "1.00"],
      ["image", "image.standard / _vip", "标准版 / 标准版 VIP", "kie", "1.00"],
      ["digital_human", "digital_human.image_talk.standard", "图片口播（Wan2.2-S2V）", "dashscope", "1.00"],
      ["digital_human", "digital_human.lipsync.basic / .lite", "视觉改口型 基础 / 极速", "volc", "1.00"],
      ["digital_human", "digital_human.lipsync.fal_v2_pro / .fal_v3", "fal Sync Lipsync 2 Pro / 3", "fal", "1.00"],
      ["voice", "voice.clone.standard", "音色克隆", "higgs_audio_v3", "1.00"],
      ["voice", "voice.synthesis.standard", "语音合成", "higgs_audio_v3", "1.00"],
      ["voice", "voice.design.standard", "音色设计", "dashscope", "1.00"],
      ["media_processing", "video.subtitle_erase.standard", "字幕擦除", "tencent_mps", "1.00"],
      ["media_processing", "video.watermark_remove.standard", "水印擦除", "tencent_mps", "1.00"],
    ],
    [14, 30, 24, 22, 10]
  ));
  c.push(P("说明：① 站点前端按 model key 前缀（bytedance / wan / kling / minimax / hailuo）动态挂载供应商标识与 logo，我方复刻同一套前缀映射逻辑；② 站点对每个能力域维护 active_profile 与 models 明细（key、display_name、discount_rate、enabled、resolution_discounts），本表即该结构的等价还原；③ 折扣率作用于积分售价而非供应商成本，用于实现「快档 7.5 折、轻量档 5 折」这类档位定价。"));
  c.push(H("2.3 逆向确认的站点功能全景", 2));
  c.push(P("站点实际存在并已逐一核验的功能入口如下。本项目第三章功能清单与之逐项对应，另加石材行业专属模块。"));
  c.push(T(
    ["分类", "真实功能入口", "说明"],
    [
      ["首页工作台", "常用工具入口 + 创作场景入口 + 发现流位", "AI 角色、爆款复刻、商详套图、电商带货、同城到店、品牌广告、剧情短片 6 大场景入口"],
      ["工具箱（视频）", "AI 视频 / 视频生成", "文生视频、图生视频、参考生，7 个模型可选"],
      ["工具箱（图片）", "AI 图片 / 图片生成", "文生图、图生图、1K/2K/4K、11 个技能包"],
      ["工具箱（数字人）", "数字人", "上传形象 → 准备音频 → 确认素材 → 开始生成；图片口播 < 60 秒约束；支持生成音频 / 直接录音 / 上传音频三种音频来源"],
      ["工具箱（处理）", "剪辑台 / 画质增强 / 字幕擦除 / 水印擦除", "基于 mediabunny 客户端合成引擎（前端 17 处引用、muxer 297 处）"],
      ["工具箱（复刻）", "爆款复刻 / 商详套图 / 电商带货 / 同城到店 / 品牌广告 / 剧情短片", "对应 19 套视频技能包，分 5 大类"],
      ["画布", "画布编辑器", "多节点画布 + 4 段新手教程视频 + 我的创作"],
      ["Agent", "Agent 对话 / Agent Cloud", "对话挂技能、云端沙箱运行时"],
      ["账户", "账户中心 / API 密钥", "资料、安全、余额、流水、订单、发票、API Key 管理"],
      ["运营后台", "20 个管理页签", "运营公告、技能包、审计、用户、批次、支付、发票、分销、用户增长、公共素材、邀请码、视频技能、任务报表等"],
    ],
    [16, 30, 54]
  ));
  c.push(H("2.4 逆向确认的 19 套视频技能包", 2));
  c.push(P("站点 GET /api/v1/video-creator/skills 接口返回 19 套技能，分属 5 个类别，每套均支持最多 30 张图 + 10 段视频 + 10 段音频作为参考素材。本项目按此清单 1:1 复刻，并保留其「分类 + 技能 + 素材槽位 + 选项组」的配置化结构。"));
  c.push(T(
    ["类别", "技能包", "类别", "技能包"],
    [
      ["电商类\n（5 套）", "口播带货 ecommerce-spoken-selling\n促销转化 ecommerce-promotion-conversion\n场景种草 ecommerce-scene-seeding\n痛点解决 ecommerce-pain-point-solution\n功能演示 ecommerce-function-demo", "本地门店类\n（4 套）", "门店发现 local-store-discovery\n到店实录 local-store-visit-record\n招牌体验 local-store-signature-experience\n同城团购 local-store-group-buy-conversion"],
      ["品牌 TVC 类\n（4 套）", "品牌主张 advertising-brand-proposition\n品牌故事 advertising-brand-story\n生活方式 advertising-lifestyle\n创意概念 advertising-creative-concept", "短剧类\n（5 套）", "对话短剧 short-drama-dialogue\n反转短剧 short-drama-reversal\n悬念短剧 short-drama-suspense\n情绪短片 short-drama-emotional\n产品植入 short-drama-product-placement"],
      ["默认", "default-director 默认导演", "—", "—"],
    ],
    [11, 39, 11, 39]
  ));
  c.push(P("★ 石材行业适配：本地门店类 4 套技能包（门店发现 / 到店实录 / 招牌体验 / 同城团购）与「石材厂家介绍视频」的业务形态高度同构——即「探店视频」模式替换为「探厂 / 探展厅视频」模式。因此本项目的石材介绍视频不另起炉灶，而是复用 local-store-visit-record 的分镜与参数结构，替换行业变量为「产品名称、规格参数、应用场景、产地、优惠政策」，从而最大化复用既有能力、降低开发成本并保证与站点行为一致。"));

  c.push(H("2.5 逆向确认的后端接口清单（89 个端点）", 2));
  c.push(P("站点后端为自建 REST API，接口前缀统一为 /api/v1。下表为核心端点分组，是本项目接口契约的基线。"));
  c.push(T(
    ["分组", "核心端点", "用途"],
    [
      ["模型与路由", "/model-routes/public、/model-routes（后台）、/tools/、/public/settings、/public/site/theme-presets", "模型路由表、能力清单、站点与主题配置"],
      ["任务与批次", "/batches、/batches/{id}、/batches/{id}/events、/video-segment-retake/quote、/media-derivatives、/video-keyframe-breakdowns", "批次提交、进度事件、分段重生成报价、派生件与关键帧拆解"],
      ["计费与充值", "/credits/quote、/credits/summary、/credits/usage、/payments/recharge-packages、/payments/orders、/usage/summary、/usage/ledger", "报价、余额、用量、充值套餐与订单、流水"],
      ["资产与素材", "/assets、/asset-groups、/upload-policy、/upload/complete、/media/metadata-probe、/resources、/canvases", "资产库、分组、两段式直传、元数据探测、画布"],
      ["数字人与音色", "/characters、/characters/tags、/voice-profiles、/voice-profiles/system-voices、/voice/presets", "形象库与标签、音色档案、系统音色、预设"],
      ["行业与发现", "/video-creator/skills、/discover/home、/canvas-group-templates、/user-prompts、/agent/skills", "19 套技能包、发现流、画布模板、提示词、Agent 技能"],
      ["后台", "/admin/users、/admin/batches、/admin/payments、/admin/invoices、/admin/affiliate/*、/admin/user-growth/*、/admin/audit、/admin/public-assets/*", "20 个后台页签的数据接口"],
    ],
    [16, 44, 40]
  ));
  c.push(P("逆向产出的全部原始证据（HTML、45 个 chunk 源码、接口响应 JSON、渲染快照、供应商价格页原文）已归档，可随时向客户出示核对。"));

  c.push(H("3. 功能全景", 1));
  c.push(H("3.1 功能模块清单", 2));
  c.push(P("下表为本项目全部功能模块及其功能点，是报价、验收与工期的共同基准。凡未列入本表的需求，一律视为新增需求，按变更流程处理。"));
  c.push(T(
    ["编号", "一级模块", "二级功能点", "说明", "优先级"],
    [
      ["M01", "门户与工作台", "首页/工作台", "Hero 区、常用工具入口、最近任务、快捷创作", "P0"],
      ["M01", "门户与工作台", "工具箱导航", "按分类（图片/视频/处理/对话/行业）聚合工具卡", "P0"],
      ["M01", "门户与工作台", "全局搜索与快捷键", "命令面板（Cmd+K）、任务搜索", "P1"],
      ["M02", "账号体系", "手机号登录", "短信验证码登录/注册，图形/滑块风控", "P0"],
      ["M02", "账号体系", "邮箱登录", "邮箱验证码登录/注册", "P0"],
      ["M02", "账号体系", "账号资料与安全", "头像、昵称、绑定手机/邮箱、登录设备管理", "P0"],
      ["M02", "账号体系", "角色与权限 RBAC", "用户/客服/运营/积分运营/财务/管理员六类角色", "P0"],
      ["M03", "素材资产库", "对象存储直传", "两段式 upload-policy + complete，前端直传不经过业务服务器", "P0"],
      ["M03", "素材资产库", "资产库与分组", "图片/视频/音频/角色四类资产，分组与筛选", "P0"],
      ["M03", "素材资产库", "资产派生与引用", "缩略图/转码派生件，跨任务引用关系", "P1"],
      ["M04", "图片生成", "文生图", "提示词 + 参考图 + 风格 + 比例 + 分辨率", "P0"],
      ["M04", "图片生成", "图生图/图片编辑", "蒙版局部重绘，参考图强度控制", "P0"],
      ["M04", "图片生成", "人物一致性套件", "脸部三视图、人物四视图、模特换脸、人脸融合", "P1"],
      ["M04", "图片生成", "商品一致性套件", "商品白底图、服装上身、服装改款、商品使用场景", "P1"],
      ["M04", "图片生成", "增强类", "人物真人感、产品一致性锁定、图片精修/超分", "P1"],
      ["M05", "视频生成", "文生视频", "提示词 + 时长 + 分辨率 + 画幅 + 运镜", "P0"],
      ["M05", "视频生成", "图生视频", "首帧/首尾帧，参考一致性", "P0"],
      ["M05", "视频生成", "视频编辑", "含输入视频的生成（换背景/换装/局部替换）", "P1"],
      ["M05", "视频生成", "智能编导模板", "19 个行业模板（口播带货/同城到店/剧情短片等）", "P1"],
      ["M06", "视频处理", "画质增强", "超分辨率 + 降噪 + 补帧", "P1"],
      ["M06", "视频处理", "字幕擦除", "框选区域无痕擦除", "P1"],
      ["M06", "视频处理", "水印擦除", "固定/动态水印，基础版与无痕版", "P1"],
      ["M07", "数字人与语音", "音色克隆", "上传 10-30s 录音创建专属音色（槽位计费）", "P1"],
      ["M07", "数字人与语音", "音色设计", "文本描述生成虚拟音色", "P2"],
      ["M07", "数字人与语音", "语音合成", "多音色 TTS，语速/情绪/SSML", "P1"],
      ["M07", "数字人与语音", "图片口播", "单张人物图 + 音频 → 口型同步视频", "P1"],
      ["M07", "数字人与语音", "视频改口型", "已有视频 + 新音频，基础/极速/高质量三档", "P1"],
      ["M08", "智能对话", "Agent 对话", "多轮对话、流式输出、会话管理、上下文记忆", "P0"],
      ["M08", "智能对话", "技能挂载", "对话中挂载图片/视频/文案技能包", "P1"],
      ["M08", "智能对话", "提示词建议", "基于素材自动产出脚本与提示词", "P1"],
      ["M09", "画布工作台", "多节点画布", "节点/连线/图层编辑，与生成任务打通", "P2"],
      ["M09", "画布工作台", "分组模板", "画布分组与模板复用", "P2"],
      ["M10", "石材行业模块", "石材材质库", "按品类/纹理/色系上传与检索石材样板", "P0"],
      ["M10", "石材行业模块", "酒店大堂效果图", "上传石材图 → 生成酒店大堂/宴会厅/前台/电梯厅空间效果图", "P0"],
      ["M10", "石材行业模块", "石材场景模板包", "14 类空间模板与软装灯光配置，后台可配置", "P0"],
      ["M10", "石材行业模块", "材质一致性校验与精修", "颜色直方图偏差校验、超阈值重生成、人工精修兜底", "P0"],
      ["M10", "石材行业模块", "厂家介绍视频", "上传厂房/展厅素材 + 数字人形象 → 探厂式介绍成片", "P0"],
      ["M10", "石材行业模块", "行业脚本与提示词模板库", "产品介绍/展会邀约/工艺讲解/客户接待话术模板", "P0"],
      ["M11", "积分与交易", "积分账户", "余额、冻结、流水、有效期、充值卡兑换", "P0"],
      ["M11", "积分与交易", "充值套餐", "多档套餐、赠送比例、报价指纹防篡改", "P0"],
      ["M11", "积分与交易", "发票", "个人/企业抬头、申请、开票状态", "P1"],
      ["M11", "积分与交易", "用量看板", "按能力/任务/时间统计积分消耗", "P1"],
      ["M12", "分销与联盟", "推广链接与落地页", "推广码归因、品牌站加盟", "P2"],
      ["M12", "分销与联盟", "佣金与结算提现", "佣金账期、结算单、提现审核", "P2"],
      ["M13", "运营后台", "用户与审核", "用户检索、封禁、强制下线、内容审核", "P0"],
      ["M13", "运营后台", "计费与充值管理", "套餐配置、充值卡、积分补发/扣减、交易冲正", "P0"],
      ["M13", "运营后台", "技能包管理", "图片技能包与视频模板的增删改、版本管理", "P0"],
      ["M13", "运营后台", "数据看板", "用户增长、任务量、成本与毛利日报", "P1"],
      ["M14", "系统支撑", "站点与主题", "站点配置、主题预设、公告、隐私与条款页", "P1"],
      ["M14", "系统支撑", "日志与审计", "操作日志、任务审计、trace_id 全链路追踪", "P0"],
    ],
    [7, 15, 24, 44, 10]
  ));

  c.push(H("4. 技术架构与选型", 1));
  c.push(H("4.1 总体架构", 2));
  c.push(P("采用「前端 SPA + 自建 REST API + 异步任务队列 + 模型路由层 + 对象存储」的经典五层结构。生成类任务一律异步化：前端提交任务后立即返回 task_id，由队列异步调用模型供应商，前端通过轮询或 SSE 获取进度。"));
  c.push(T(
    ["层次", "技术选型", "说明"],
    [
      ["前端", "Next.js 15（App Router）+ React 19 + TypeScript + Tailwind CSS（CSS 变量主题）", "服务端渲染保证首屏与 SEO；客户端组件承载编辑器与画布"],
      ["状态与数据", "TanStack Query + Zustand + ky HTTP 客户端", "服务端状态缓存、登录态失效检测、统一错误拦截"],
      ["后端", "Spring Boot 3.5 / Java 21 + PostgreSQL + Redis", "RESTful、OpenAPI 契约优先；Redis 做队列与热点缓存；后端全量 Java，团队零交接成本"],
      ["对象存储", "阿里云 OSS 或火山 TOS（推荐火山 TOS，与模型供应商同区）", "前端直传 + CDN 加速 + 图片处理参数化"],
      ["任务队列", "Redis + Redisson（延迟队列）+ Quartz（定时任务）", "按能力域分队列，限流与重试策略独立配置"],
      ["模型接入", "统一 Model Adapter 层 + 配置化路由表", "每种能力一个适配器，供应商差异被隔离在适配器内"],
      ["流式输出", "SSE（对话、任务进度）", "对话采用 SSE 增量推送，生成任务采用事件轮询"],
      ["支付", "微信支付 + 支付宝，对接服务商模式", "需企业主体与相应资质"],
      ["监控", "Sentry + Grafana + Loki + OpenTelemetry", "错误、性能、日志、链路四位一体"],
    ],
    [16, 42, 42]
  ));
  c.push(H("4.2 后端技术栈（Java）", 2));
  c.push(P("后端与异步执行器全量采用 Java 21 + Spring Boot 3.5。前端保留 TypeScript，因 mediabunny 剪辑台等复刻命脉依赖原站前端 chunk 结构不可替换；前后端不共享源码，只共享 OpenAPI 契约（springdoc 导出 openapi.json → openapi-typescript 生成前端类型 → CI 校验契约漂移）。"));
  c.push(T(
    ["组件", "选型", "用途"],
    [
      ["框架", "Spring Boot 3.5 / Java 21 LTS", "模块化 DI；虚拟线程对 SSE 长连接与并发模型调用友好"],
      ["认证授权", "Spring Security 6", "双 Token、login_version 强制下线、@PreAuthorize 方法级 RBAC"],
      ["数据访问", "MyBatis-Plus 3.5 + Flyway 10", "类型安全 CRUD，复杂毛利报表走原生 SQL；迁移脚本版本化"],
      ["缓存与队列", "Redisson 3", "分布式锁、令牌桶限流、延迟队列、RTopic 跨进程广播"],
      ["定时任务", "Quartz", "通道余额巡检、健康检查、日终对账"],
      ["熔断降级", "Resilience4j 2", "ChannelRouter 的熔断、重试、舱壁隔离"],
      ["上游调用", "OkHttp 4", "Adapter 调模型供应商：超时、连接池、埋点拦截器"],
      ["契约", "springdoc-openapi", "自动导出 OpenAPI 契约，作为前后端唯一真相源"],
    ],
    [16, 26, 58]
  ));
  c.push(H("4.3 分层职责约定", 2));
  c.push(bullet("Controller 层：参数校验、鉴权、权限判定、响应封装，不写业务分支。"));
  c.push(bullet("Service 层：业务编排、事务边界、积分扣减与补偿，是核心逻辑所在。"));
  c.push(bullet("Adapter 层：对接外部模型供应商，负责请求转换、轮询/回调解析、错误归一化。"));
  c.push(bullet("Mapper 层（MyBatis-Plus）：数据访问，禁止跨表直接 join 写操作。"));
  c.push(H("4.4 目录结构约定", 2));
  c.push(P("apps/web  前端主体（Next.js + TypeScript）；service/  Java 后端多模块工程（common 公共模块、domain 领域层、model-adapters 模型适配器、api API 服务、worker 异步任务执行器）；packages/contracts  OpenAPI 契约（前后端唯一共享物）；infra  部署脚本与 IaC。前后端不共享源码，只共享 OpenAPI 契约。"));
  c.push(H("4.5 环境规划", 2));
  c.push(T(
    ["环境", "用途", "数据", "部署方式"],
    [
      ["local", "开发自测", "种子数据", "本地 Docker Compose"],
      ["dev", "集成测试", "脱敏样本", "单台 4C8G，CI 自动部署"],
      ["staging", "客户验收 / 压测", "仿真数据", "与生产同构配置"],
      ["prod", "正式环境", "真实数据", "多可用区 + 负载均衡 + 自动伸缩"],
    ],
    [14, 30, 24, 32]
  ));

  c.push(H("5. 前端开发规范", 1));
  c.push(H("5.1 路由与页面清单", 2));
  c.push(T(
    ["路由", "页面", "说明"],
    [
      ["/", "首页/工作台", "首屏聚合：Hero、场景入口、常用工具、发现流"],
      ["/toolbox", "工具箱", "全部工具分类列表"],
      ["/toolbox/image-generation", "图片生成", "11 技能包配置化渲染"],
      ["/toolbox/video-generation", "视频生成", "批次任务、脚本与分镜"],
      ["/toolbox/ecommerce-image-set", "商详套图", "卖点分析 + 批量出图 + 单行重生成"],
      ["/toolbox/depth-video-clone", "深度复刻", "基于原视频动作轮廓替换人物与商品"],
      ["/toolbox/video-remix-viral", "一键裂变", "拆条重组生成多条新视频"],
      ["/toolbox/video-quality-enhance", "画质增强", "分辨率提升与补帧"],
      ["/toolbox/video-subtitle-erase", "字幕擦除", "框选区域擦除"],
      ["/assets", "资产库", "素材、分组、角色、派生件"],
      ["/canvas", "画布", "多节点编辑器"],
      ["/agent-chat", "智能对话", "会话与流式输出"],
      ["/agent-cloud", "云端 Agent（可选）", "沙箱运行时，见第 13 章取舍"],
      ["/account", "账户中心", "资料、安全、余额、流水、订单、发票"],
      ["/admin/*", "运营后台", "用户、技能包、计费、看板、审核"],
    ],
    [30, 24, 46]
  ));
  c.push(H("5.2 组件划分", 2));
  c.push(bullet("基础层：Button / Input / Select / Modal / Drawer / Toast / Table / Tabs / Upload / Empty / Skeleton。"));
  c.push(bullet("业务层：ToolCard / SkillPicker / ReferenceSlotPicker / ModelSelect / ResolutionSelect / DurationSelect / QuotePanel / TaskProgress / BatchTable / AssetPicker / CharacterPicker / CreditBadge。"));
  c.push(bullet("能力层：QuotePanel 是统一计费确认组件（所有生成类入口必须复用），负责展示「预计消耗积分 / 余额 / 余额不足时跳转充值」。"));
  c.push(H("5.3 主题与样式", 2));
  c.push(P("所有颜色、圆角、阴影、字号以 CSS 变量表达（--color-primary、--color-surface、--radius-md 等），主题预设以 JSON 描述变量集合，运行时注入 style 变量，支持不少于 6 套内置主题 + 后台自定义主题，避免将品牌色硬编码进组件。"));
  c.push(H("5.4 性能指标", 2));
  c.push(T(
    ["指标", "目标", "测量方式"],
    [
      ["首屏 LCP", "≤ 2.0s（4G/中端安卓）", "Lighthouse CI"],
      ["交互 INP", "≤ 200ms", "RUM 上报"],
      ["首屏 JS 体积", "≤ 320KB（gzip）", "构建产物分析"],
      ["列表滚动", "60fps（1000 条资产）", "性能面板录制"],
      ["上传成功率", "≥ 99.5%", "服务端埋点"],
    ],
    [28, 40, 32]
  ));

  c.push(H("6. 后端接口规范", 1));
  c.push(H("6.1 通用约定", 2));
  c.push(bullet("统一前缀 /api/v1；资源路径用小写复数名词，动作用 /quote /complete /submit 等子资源表达。"));
  c.push(bullet("鉴权：Authorization: Bearer <access_token>；access_token 15 分钟、refresh_token 30 天，客户端静默续期，服务端提供登录态版本号以支持强制下线。"));
  c.push(bullet("成功响应：{ \"data\": ..., \"request_id\": \"...\" }；列表：{ \"data\": [...], \"pagination\": { page, page_size, total } }。"));
  c.push(bullet("错误响应：{ \"error\": { \"code\": \"auth.unauthorized\", \"message\": \"...\", \"detail\": {...}, \"trace_id\": \"...\" } }，code 为机器可读枚举，message 为中文可展示文案。"));
  c.push(bullet("HTTP 状态码语义化：400 参数错误、401 未登录、402 积分不足、403 无权限、404 不存在、409 冲突、429 限流、4021 任务失败。"));
  c.push(H("6.2 核心端点清单", 2));
  c.push(T(
    ["模块", "端点", "说明"],
    [
      ["认证", "POST /auth/send-sms-code | send-email-code", "验证码下发，带频率与图形风控"],
      ["认证", "POST /auth/login-or-register-by-phone | -by-email-code", "登录即注册，返回双 Token"],
      ["认证", "POST /auth/refresh | GET /auth/me | POST /auth/logout", "续期、当前用户、登出"],
      ["账户", "GET/PUT /me/profile | POST /me/bind-phone | bind-email", "资料与绑定"],
      ["资产", "POST /assets/upload-policy | POST /assets/complete", "两段式直传"],
      ["资产", "GET /assets | GET /assets/{id} | DELETE /assets/{id}", "资产列表与详情"],
      ["分组", "GET/POST /asset-groups", "资产分组"],
      ["任务", "POST /batches | GET /batches | GET /batches/{id}", "生成批次提交与查询"],
      ["任务", "POST /batches/image-edit | /batches/image-edit/versions", "图片编辑任务与版本"],
      ["计费", "POST /credits/quote", "报价：返回预计积分、明细、余额、折扣后价"],
      ["计费", "GET /credits/summary | GET /usage/summary | GET /usage/ledger", "余额、用量汇总、明细流水"],
      ["充值", "GET /payments/recharge-packages", "充值套餐列表（含赠送与折扣）"],
      ["充值", "POST /payments/recharge-orders | POST /recharge-cards/redeem", "下单、充值卡兑换"],
      ["发票", "GET/POST /invoices/profiles | /invoices/requests | /invoices/summary", "抬头、申请、汇总"],
      ["画布", "GET/POST /canvases | GET/PUT/DELETE /canvases/{id}", "画布 CRUD"],
      ["画布", "GET/POST /canvas-group-templates", "画布分组模板"],
      ["对话", "POST /agent/conversations | GET /agent/conversations | POST /agent/conversations/{id}/messages", "会话与消息（SSE 流式）"],
      ["对话", "GET /agent/skills", "可挂载技能列表"],
      ["音色", "GET/POST /voice-profiles | GET /voice-profiles/system-voices", "音色列表/创建/系统音色"],
      ["语音", "POST /voice-profiles/system-voices/synthesize", "语音合成"],
      ["转写", "POST /speech-input/transcribe", "语音输入转写"],
      ["发现", "GET /discover/home | /discover/items", "首页发现流"],
      ["模型", "GET /model-routes/public", "模型路由与折扣表（可公开）"],
      ["站点", "GET /public/settings | /public/site/theme-presets | /public/site/theme-preview", "站点配置与主题"],
      ["工具", "GET /tools | /tools/image-generation/skill-packs | /video-creator/skills", "工具目录与技能包"],
      ["后台", "GET/PUT /admin/users | /admin/skill-packages | /admin/recharge-packages", "运营管理"],
      ["分销", "POST /affiliate/partner/submit | GET /affiliate/commissions | /settlements", "联盟（可选）"],
    ],
    [12, 46, 42]
  ));
  c.push(H("6.3 幂等与并发", 2));
  c.push(bullet("所有创建类接口支持 Idempotency-Key（Redis 保存 24 小时），重复提交返回首次结果。"));
  c.push(bullet("积分扣减采用「冻结 → 扣减 → 结算/退回」三段式：提交任务时冻结预计积分，成功结算、失败退回，避免退款漏洞。"));
  c.push(bullet("任务执行使用分布式锁 + 幂等键，供应商回调与主动轮询双通道不重复结算。"));
  c.push(H("6.4 前后端契约生成链路", 2));
  c.push(P("后端为 Java 后，前后端不共享源码，只以 OpenAPI 契约为唯一真相源：后端 springdoc-openapi 导出 openapi.json 存入 packages/contracts，前端用 openapi-typescript 生成 apps/web/generated/api.ts 类型。CI 必须校验契约无漂移，否则构建失败。接口变更流程为「改后端 DTO → 本地跑 gen:api → 同 PR 提交契约与生成物」。"));
  c.push(T(
    ["CI 规则", "实现方式"],
    [
      ["契约与后端一致", "导出 openapi.json 与 packages/contracts 快照 diff，有差异即失败"],
      ["前端类型已同步", "CI 跑 gen:api 后 git diff --exit-code apps/web/generated/api.ts"],
      ["契约随代码提交", "契约文件变更必须与后端代码在同一 PR 内"],
    ],
    [30, 70]
  ));
  c.push(H("6.5 Java 后端工程约定", 2));
  c.push(P("后端代码分层为 Controller → Service → Mapper，事务边界只落在 Service 方法上；跨通道的网络调用不得包裹在数据库事务内。领域层不依赖任何 Web 与队列框架类；model-adapters 模块只认 DTO，不认数据库实体。以下约定以 ArchUnit 架构测试强制执行，违反即构建失败。"));
  c.push(T(
    ["类型", "命名约定", "示例"],
    [
      ["Controller", "XxxController", "TaskController、AdminChannelController"],
      ["Service", "XxxService + XxxServiceImpl", "PricingService / PricingServiceImpl"],
      ["Mapper", "XxxMapper（BaseMapper<T>）", "ModelEndpointMapper"],
      ["实体", "XxxEntity（@TableName）", "ModelEndpointEntity"],
      ["请求 DTO", "XxxRequest（record）", "SubmitTaskRequest"],
      ["响应 DTO", "XxxResponse（record）", "TaskResponse"],
      ["适配器", "XxxAdapter implements ModelAdapter", "RelayAdapter"],
      ["配置项", "XxxProperties（@ConfigurationProperties）", "ChannelProperties"],
    ],
    [22, 40, 38]
  ));
  c.push(bullet("工具链门禁：Maven 多模块构建；Spotless 格式化（palantir-java-format）；SpotBugs + Checkstyle 静态检查；ArchUnit 架构测试；JUnit 5 + Testcontainers（PostgreSQL/Redis 真实容器），领域层测试覆盖率不低于 70%。"));

  c.push(H("7. 数据模型", 1));
  c.push(T(
    ["表名", "关键字段", "说明"],
    [
      ["users", "id, phone, email, role, status, credit_version", "用户与角色，credit_version 用于强制下线"],
      ["user_sessions", "user_id, access_token_hash, refresh_token_hash, expires_at", "登录会话"],
      ["assets", "id, user_id, kind, object_key, mime, size, meta, group_id", "资产元数据"],
      ["asset_groups", "id, user_id, name", "资产分组"],
      ["characters", "id, user_id, name, tags, voice_profile_id", "数字角色（形象）"],
      ["voice_profiles", "id, user_id, provider_voice_id, type, status", "音色（克隆/设计/系统）"],
      ["batches", "id, user_id, tool, skill_key, status, params, quoted_credits, charged_credits, task_id", "生成批次主表"],
      ["batch_items", "id, batch_id, index, input, output_asset_id, status", "批次内的单条任务"],
      ["credit_accounts", "user_id, available, frozen, total_in, total_out", "积分账户"],
      ["credit_ledger", "id, user_id, type, amount, balance_after, biz_type, biz_id, expire_at", "积分流水（不可变）"],
      ["credit_quotes", "id, user_id, fingerprint, breakdown_json, estimated_credits, expires_at", "报价快照，防篡改与对账"],
      ["recharge_packages", "code, name, package_amount, original_amount, credits, bonus, valid_days", "充值套餐"],
      ["recharge_orders", "id, user_id, package_code, amount, credits, status, trade_no", "充值订单"],
      ["recharge_cards", "code, credits, valid_days, used_by", "充值卡"],
      ["usage_records", "id, user_id, capability, provider, model, tokens, seconds, cost_amount, credits", "成本与用量明细（毛利核算用）"],
      ["model_routes", "capability, key, provider, model, enabled, discount_rate, resolution_discounts", "模型路由与折扣表"],
      ["invoices", "id, user_id, profile_id, amount, status, tax_no", "发票申请"],
      ["affiliate_*", "partner, commission, settlement, withdrawal", "联盟分销（可选）"],
      ["audit_logs", "id, actor_id, action, target, ip, created_at", "操作审计"],
    ],
    [22, 40, 38]
  ));

  c.push(H("8. 积分与计费体系（核心）", 1));
  c.push(H("8.1 设计原则", 2));
  c.push(num("单一货币：全站只有「积分」一种计价单位，1 积分 = 1 元面值锚定，所有能力以积分报价，用户心智简单。"));
  c.push(num("成本反推定价：每个能力的售价积分由「上游模型成本 ÷ (1 − 目标毛利率)」推导，并按整数向上取整，标价对用户是整数、对我方可核算。"));
  c.push(num("明码标价：生成前必须调用报价接口返回预计积分与明细（分项积分 + 折扣标签），用户确认后才扣费，杜绝「事后告知」。"));
  c.push(num("失败不收费：供应商侧生成失败、审核不通过、任务超时，一律全额退回冻结积分。"));
  c.push(num("有效期：积分自充值到账起 2 年有效，系统按最早到期批次优先扣减，过期前站内提醒。"));
  c.push(num("不可提现：积分不支持转赠、提现与退款，这一点须在充值页显著提示，避免后续纠纷。"));
  c.push(H("8.2 报价与扣费流程", 2));
  c.push(T(
    ["步骤", "系统动作", "接口", "失败处理"],
    [
      ["1. 询价", "前端携带能力、参数、数量请求报价；服务端按模型路由 + 折扣表计算分项积分，返回报价指纹", "POST /credits/quote", "报价失败禁止提交，提示重试"],
      ["2. 冻结", "提交任务时冻结预计积分（余额不足返回 402）", "POST /batches", "余额不足→引导充值"],
      ["3. 执行", "队列调用供应商模型，实时回传进度", "worker", "失败→释放任务"],
      ["4. 结算", "成功按实际用量结算并扣减冻结；失败/取消全额退回", "worker", "超时按实际已产出结算"],
      ["5. 出账", "写入 credit_ledger 与 usage_records（同时记录我方真实成本）", "—", "对账任务每日校验"],
    ],
    [10, 38, 22, 30]
  ));
  c.push(H("8.3 积分定价表（含成本与毛利）", 2));
  c.push(P("下表为本平台的建议定价。成本列取 2026-10-29 实测抓取的供应商公开刊例价（Kie.ai 市场页、阿里百炼官方文档、火山方舟文档、fal.ai 模型页），非估算值；计费口径为「输出规格」而非「输入规格」。毛利 = （售价积分 − 成本）÷ 售价。所有成本口径按「只多不少」原则上浮：刊例价 × 汇率 7.2 × 1.3（通道加价、失败重试摊销、单价波动）。"));
  const pricing = [
    ["对话", "标准版智能对话", "每千 Token", "1", "0.02", 0.02, "98%", "98%", "doubao-seed-2.0-mini"],
    ["对话", "脚本/提示词生成", "每次", "2", "0.06", 0.05, "97%", "98%", "doubao-seed-2.0-lite"],
    ["对话", "语音输入转写", "每分钟", "1", "0.03", 0.03, "97%", "97%", "Seed-ASR 2.0"],
    ["语音", "语音合成（标准音色）", "每万字符", "8", "3.00", 2.55, "62%", "68%", "豆包语音合成 2.0"],
    ["语音", "音色克隆（槽位，一次性）", "每个音色", "260", "138.00", 117.3, "47%", "55%", "豆包声音复刻 2.0"],
    ["语音", "音色设计", "每次", "120", "50.00", 42.5, "58%", "65%", "dashscope"],
    ["图片", "文生图 1K", "每张", "3", "0.28", 0.24, "91%", "92%", "LC Image 2.5 Pro"],
    ["图片", "文生图 2K", "每张", "5", "0.47", 0.4, "91%", "92%", "LC Image 2.5 Pro"],
    ["图片", "文生图 4K", "每张", "8", "0.75", 0.64, "91%", "92%", "LC Image 2.5 Pro"],
    ["图片", "图片编辑（蒙版局部重绘）", "每张", "4", "0.47", 0.4, "88%", "90%", "LC Image 2.5 Pro"],
    ["图片", "换脸/服装上身/人脸融合", "每张", "8", "0.75", 0.64, "91%", "92%", "LC Image 2.5 Pro"],
    ["图片", "三视图/四视图/一致性套件", "每套", "10", "1.50", 1.27, "85%", "87%", "LC Image 2.5 Pro"],
    ["图片", "图片精修/超分", "每张", "2", "0.28", 0.24, "86%", "88%", "LC Image 2.5 Pro"],
    ["图片", "商详套图（10 张）", "每套", "40", "4.68", 3.98, "88%", "90%", "LC Image 2.5 Pro"],
    ["视频", "文生视频 480P 5 秒", "每条", "6", "2.69", 2.29, "55%", "62%", "Seedance 2.0"],
    ["视频", "文生视频 720P 5 秒", "每条", "14", "5.85", 4.97, "58%", "65%", "Seedance 2.0"],
    ["视频", "文生视频 1080P 5 秒", "每条", "35", "14.51", 12.33, "59%", "65%", "Seedance 2.0"],
    ["视频", "图生视频 720P 5 秒（含输入视频）", "每条", "35", "15.44", 13.12, "56%", "63%", "Seedance 2.0"],
    ["视频", "全模态视频 1080P 5 秒", "每条", "50", "22.23", 18.9, "56%", "62%", "Seedance 2.5"],
    ["视频", "超写实视频 720P 5 秒", "每条", "9", "3.74", 3.18, "58%", "65%", "Wan 3.0"],
    ["视频", "超写实视频（优速）720P 5 秒", "每条", "14", "5.90", 5.02, "58%", "64%", "Wan 3.0 Prime"],
    ["视频", "轻量视频 720P 5 秒", "每条", "3", "1.17", 0.99, "61%", "67%", "Seedance 2.0 Mini"],
    ["视频", "分镜批量生成（5 镜 × 5 秒 480P）", "每组", "30", "13.46", 11.44, "55%", "62%", "Seedance 2.0"],
    ["视频", "Kling 4.0 参考生 720P 5 秒", "每条", "18", "7.96", 6.77, "56%", "62%", "Kling 4.0"],
    ["视频", "画质增强 720P", "每分钟", "12", "5.00", 4.25, "58%", "65%", "火山 AI MediaKit"],
    ["视频", "字幕擦除（无痕）720P", "每分钟", "6", "1.50", 1.27, "75%", "79%", "腾讯云 MPS"],
    ["视频", "字幕擦除（无痕）1080P", "每分钟", "10", "3.00", 2.55, "70%", "74%", "腾讯云 MPS"],
    ["视频", "水印擦除 1080P（基础/无痕）", "每分钟", "8", "3.00", 2.55, "62%", "68%", "腾讯云 MPS"],
    ["数字人", "图片口播 30 秒（720P）", "每条", "80", "35.18", 29.9, "56%", "63%", "Wan2.2-S2V"],
    ["数字人", "图片口播 60 秒（720P）", "每条", "160", "70.37", 59.81, "56%", "63%", "Wan2.2-S2V"],
    ["数字人", "图片口播 60 秒（480P 轻量）", "每条", "90", "39.16", 33.29, "56%", "63%", "Wan2.2-S2V"],
    ["数字人", "视频改口型 1 分钟（火山通道）", "每分钟", "260", "117.00", 99.45, "55%", "62%", "火山视觉改口型"],
    ["数字人", "视频改口型 1 分钟（fal 通道）", "每分钟", "170", "74.86", 63.63, "56%", "63%", "fal Sync Lipsync 3"],
    ["石材", "石材空间效果图（单张 2K，含 2 次重试）", "每张", "8", "1.40", 1.19, "82%", "85%", "LC Image 2.5 Pro"],
    ["石材", "石材空间效果图（4K 高精版）", "每张", "12", "1.50", 1.27, "88%", "89%", "LC Image 2.5 Pro"],
    ["石材", "石材空间批量出图（6 张套 2K）", "每套", "45", "3.65", 3.1, "92%", "93%", "LC Image 2.5 Pro"],
    ["石材", "石材厂家介绍视频 60 秒（标准版）", "每条", "320", "95.73", 81.37, "70%", "75%", "组合链路"],
    ["石材", "石材厂家介绍视频 60 秒（轻量版）", "每条", "165", "48.62", 41.33, "71%", "75%", "组合链路"],
  ];
  c.push(T(["能力域", "计费项", "规格/单位", "售价积分", "官方成本", "中转成本", "官方毛利", "中转毛利", "主用模型"], pricing, [9, 26, 13, 9, 10, 10, 8, 8, 17]));
  c.push(P("说明：① 石材类定价在通用能力成本上加 15%~25% 溢价，用于覆盖行业模板调优与人工兜底出图成本；② 高规格视频（4K、1080P 15 秒以上）按实际 Token 用量计费，报价接口动态返回，用户看到的仍是整数积分；③ 联盟分销渠道另有充值折扣率，折扣直接从套餐价扣减而非从模型成本扣减。", { size: 18, color: "5A7079" }));
  c.push(H("8.3.1 售价积分后台可配（运营杠杆）", 2));
  c.push(P("售价积分不得硬编码在代码里。平台运营方需能随时调整每个能力的售价积分，以应对三类变化：模型成本波动（中转站调价、汇率、通道切换）、竞品定价、促销与大促策略。"));
  c.push(P("实现方式：售价从代码常量改为配置表 ability_pricing 驱动，字段包括 capability（能力域）、model_key（模型键）、spec（规格）、points（售价积分）、cost_override（成本覆盖，可选）、discount_rate（折扣率）、effective_from（生效时间）、version（版本号）、updated_by（操作人）。后台修改后缓存失效，30 秒内生效，无需重启服务。"));
  c.push(T(
    ["项", "规则"],
    [
      ["改价生效", "≤ 30 秒全局生效，无需重启；新价只影响生效后新提交的任务，已提交任务按原价结算"],
      ["毛利护栏", "改价时实时显示「按当前成本该售价的毛利率」；毛利率 < 30% 黄色警告，< 10% 或售价低于成本时禁止保存"],
      ["改价审计", "记录操作人、时间、改前值、改后值、理由；可回溯、可导出，用于应对价格纠纷"],
      ["批量调价", "支持按能力域 / 按通道批量调整（如中转站调价后一键对齐全站售价）"],
      ["回滚", "保留历史版本，可一键回滚至任一历史定价"],
      ["A/B 定价", "同一能力可配置多套售价用于灰度（如新客价 / 老客价 / 活动价），按用户分组命中"],
    ],
    [16, 84]
  ));
  c.push(P("★ 定价公式：售价积分 = ceil(官方刊例成本 × 实际通道 cost_ratio ÷ (1 − 目标毛利率))。当前目标毛利率区间按 55%~91%（与 §8.3 表一致），走中转通道时同等售价下的实际毛利率高于表中「中转毛利」列以外的估算。"));

  c.push(H("8.4 充值套餐与赠送策略", 2));
  c.push(T(
    ["套餐", "支付金额（元）", "到账积分", "赠送比例", "适用人群"],
    [
      ["体验包", "99", "100", "0%", "新客试用"],
      ["标准包", "500", "520", "4%", "个人创作者"],
      ["进阶包", "2,000", "2,120", "6%", "活跃工作室"],
      ["专业包", "5,000", "5,400", "8%", "企业客户"],
      ["旗舰包", "20,000", "22,400", "12%", "大额采购"],
      ["代理包", "50,000", "58,000", "16%", "分销商/联盟"],
    ],
    [16, 22, 18, 16, 28]
  ));
  c.push(P("赠送策略的作用是让「到账积分 > 支付金额」，但同时必须保证综合毛利不被击穿：按上表加权平均赠送约 7%，在第 8.3 节积分加权毛利率（≈61%）的基础上再扣 7%，综合毛利约 57%；再扣服务器/存储/短信/支付手续费（0.6%）/坏账后，运营净利率约 40%~50%。"));
  c.push(H("8.5 成本监控与风控", 2));
  c.push(bullet("每条 usage_record 记录供应商、模型、Token/秒数、真实成本、扣费积分、折扣率，日终聚合产出「每个能力的实际毛利率日报」。"));
  c.push(bullet("设置单能力毛利率熔断线：连续 3 日实际毛利率低于目标值 15 个百分点时，自动下调该能力默认模型或暂停折扣。"));
  c.push(bullet("风控：同 IP/同设备注册频次、验证码轰炸、异常高频生成、批量薅试用额度，均有规则与人工审核两级处置。"));
  c.push(bullet("对账：每日与供应商账单核对，若差异率 > 0.5% 触发告警并暂停该供应商渠道。"));

  c.push(H("9. 模型供应链", 1));
  c.push(H("9.1 能力域与供应商矩阵（含接入通道）", 2));
  c.push(P("「接入通道」列定义该能力域的取货路径：中转站为默认主通道（拿货价低、毛利高），官方直连为降级兜底通道。★ 敏感数据能力域（图片生成、音色克隆、数字人口播）默认走官方直连，理由见 §9.5。"));
  c.push(T(
    ["能力域", "主用模型", "备选模型", "接入通道", "计费方式", "单价（参考）", "折扣率", "降级策略"],
    [
      ["文本对话", "doubao-seed-2.0-lite/mini", "doubao-seed-2.1-turbo、glm-5.3-flash", "中转 → 官方", "Token", "0.2~0.6 元/百万输入", "1.00", "主模型超时→切 lite；全部失败→提示稍后"],
      ["图片生成", "LC Image 2.5 Pro", "LC Image 2.5 Fast、Seedream 4K", "官方直连", "按张", "$0.03~$0.12/张", "1.00 / 0.80", "Pro 失败→Fast 重试一次，仍失败则退款"],
      ["视频生成", "Seedance 2.0 / 2.5", "Seedance 2.0 Fast / Mini、Wan 3.0 / Prime、Kling 4.0", "中转 → 官方", "按秒（输出时长）", "0.30~3.42 元/秒", "1.00 / 0.75 / 0.50 / 0.90", "按用户选择的模型档位执行，不静默降级"],
      ["视频编辑", "Seedance 2.0（含输入视频）", "Wan 3.0、Kling 4.0", "中转 → 官方", "按秒（输出 + 输入时长）", "0.60~3.60 元/秒", "1.00", "同上；参考生含输入视频时按双倍时长计费"],
      ["视频处理", "火山 AI MediaKit", "腾讯云 MPS 自研", "中转 → 官方", "按秒/分钟", "3~30 元/分钟", "1.00", "供应商故障→切换另一家"],
      ["字幕/水印擦除", "腾讯云 MPS", "自研 ffmpeg + inpaint", "中转 → 官方", "元/分钟", "0.17~6 元/分钟", "1.00", "同上"],
      ["语音合成", "豆包语音合成 2.0", "阿里 dashscope、fal MiniMax Speech-02", "中转 → 官方", "万字符", "2.8~3 元/万字符", "1.00", "失败换备用音色重试"],
      ["音色克隆", "豆包声音复刻 2.0", "—", "官方直连", "槽位 + 万字符", "138 元/音色 + 2.8 元/万字符", "1.00", "失败释放槽位"],
      ["图片口播", "Wan2.2-S2V（阿里百炼）", "火山视觉改口型、fal Sync Lipsync 3", "官方直连", "按秒", "1.17 元/秒（720P 刊例 ¥0.9 × 1.3）", "1.00", "失败可降级为「静态图 + 字幕」；480P 轻量档 ¥0.5/秒"],
      ["视频改口型", "火山视觉改口型", "fal Sync Lipsync 3 / 2、腾讯云 MPS", "中转 → 官方", "按秒/分钟", "1.95 元/秒；fal $0.1333/秒（v3）、$3/分钟（v2）", "1.00", "按用户档位执行；高档位故障自动提示可降档重试"],
    ],
    [11, 16, 17, 12, 11, 14, 8, 17]
  ));
  c.push(H("9.2 路由与折扣机制", 2));
  c.push(bullet("模型路由以配置表（model_routes）驱动，运营可在后台开关任意能力域的模型、调整折扣率与分辨率阶梯价。"));
  c.push(bullet("折扣率作用于积分售价而非供应商成本，用于实现「快档 7.5 折、轻量档 5 折、超写实 9 折」等档位定价。"));
  c.push(bullet("价格随供应商调价同步更新：适配器启动时拉取供应商价格表（如火山 ListPricing），与本地配置偏差 > 10% 时告警并暂停对应档位售卖。"));
  c.push(H("9.3 采购策略与渠道配置", 2));
  c.push(P("★ 本节为平台方内部口径，含拿货价与渠道策略，不对外提供。对外客户版的成本口径一律按官方刊例价列示。"));
  c.push(bullet("主通道 · 中转站：通过模型聚合服务商统一拿货，目标折扣 ≥ 85 折。优势是拿货价低、一站接入多模型、单次充值门槛低；劣势是稳定性、模型版本一致性、合规性均不可控。选型至少评估 2 家做 A/B 对比。"));
  c.push(bullet("兜底通道 · 官方直连：火山方舟（Seedance 2.0/2.5、豆包语音合成、声音复刻、视觉改口型、MediaKit）、阿里百炼（Wan 3.0 / Prime）、腾讯云（VOD + MPS 智能擦除）、KIE / fal.ai（图片与高端 lipsync）。承担中转站故障时的自动降级，以及敏感数据能力域。"));
  c.push(bullet("成本口径规则：真实成本 = 官方刊例成本 × 该通道 cost_ratio（中转通道当前按 0.85 估算，官方通道 1.00）。任务实际使用哪条通道，就按哪条的成本核算毛利，明细见《xin.ai 中转站接入需求 V1》§5.1。"));
  c.push(bullet("余额管理：中转站多为预充值模式，须按日用量监控余额并设置三级告警（30 / 14 / 7 天用量），余额耗尽将导致该能力域全站不可用。"));
  c.push(bullet("推荐首期采购额度：中转站视频类 20,000 元、图片类 5,000 元、语音类 3,000 元、擦除类 2,000 元、文本类 1,000 元，合计约 31,000 元作为启动额度；官方直连通道同步预留最低可用额度用于降级。"));
  c.push(H("9.4 渠道路由与双通道架构", 2));
  c.push(P("平台的模型供应链不绑定单一供应商，而是以「渠道路由层」组织：每个能力域可配置多条接入通道，按优先级选择，失败自动降级。中转站与官方直连共用同一套 Adapter、计费与任务框架，用户侧完全无感。"));
  c.push(T(
    ["通道角色", "接入方式", "成本承担", "取货价", "密钥管理", "适用能力域"],
    [
      ["主通道 · 中转站", "平台自有聚合服务商账号池 + 预充值", "平台承担，计入积分定价成本口径", "刊例价 × 0.85（目标）", "接入点入库可改；密钥走密钥管理服务", "视频生成、视频编辑、视频处理、字幕水印擦除、语音合成、视频改口型、文本对话"],
      ["兜底通道 · 官方直连", "平台自有厂商账号 + 资源包 / 量价协议", "平台承担，计入积分定价成本口径", "刊例价 × 1.00", "接入点入库可改；密钥走密钥管理服务", "全能力域（降级目标）；图片生成、音色克隆、图片口播默认即走此通道"],
      ["用户自带 Key", "用户在账户中心绑定自有模型账号", "用户自负，平台不承担", "—", "AES-256 加密入库，前台仅掩码，平台不记录明文", "全能力域（可选通道，不消耗积分）"],
    ],
    [14, 20, 17, 13, 18, 18]
  ));
  c.push(bullet("★ 敏感数据能力域默认走官方直连：石材客户上传的厂房 / 展厅实拍、数字人形象照与录音授权文件属商业机密，采购前无法确认中转站数据留存策略的能力域，一律不走中转。"));
  c.push(bullet("调用优先级：按 model_channels.priority 排序，主通道失败（超时 / 429 / 5xx / 连接失败）时自动切换兜底通道，切换对用户透明。"));
  c.push(bullet("熔断与恢复：通道失败率超阈值自动摘除，进入冷却后半开探测，成功则重新纳入流量，无需人工干预。"));
  c.push(bullet("计费一致性：整个降级过程只冻结一次积分、按一次结算，幂等键贯穿全部通道尝试，杜绝重复扣费与重复执行。"));
  c.push(bullet("用户侧透明度：主通道正常时无任何提示；主通道失败但兜底成功时同样无提示；全部失败时提示「服务繁忙」并全额退回积分。对外统一表述为「备用通道」，不透出中转站、上游厂商等内部信息。"));
  c.push(bullet("成本采集：usage_record 记录实际通道、官方成本、真实拿货成本、中转节省额、扣费积分与毛利，支持按能力域 / 通道 / 模型三级拆分出日报。"));
  c.push(H("9.5 中转站专项要求", 2));
  c.push(P("中转站的稳定性是本平台的主要外部风险，以下为硬性验收项，完整设计见《xin.ai 中转站接入需求 V1》："));
  c.push(T(
    ["要求项", "判定标准"],
    [
      ["通道可切换", "在后台「模型接入」页签修改模型接入点（base_url / 通道 / 上游模型名）即可完成切换，无代码改动、无重新构建镜像、无需重启服务"],
      ["降级不丢单", "主通道全挂时，平台生成成功率下降 ≤ 3%，无任务丢失"],
      ["不重复扣费", "切换场景下 1000 次任务，扣费与实际调用一一对应，误差为 0"],
      ["自动恢复", "主通道恢复后 5 分钟内自动重新纳入流量，无需人工干预"],
      ["成本可追溯", "抽查 100 条任务，100% 可追溯到通道、真实成本与扣费积分"],
      ["密钥安全", "全量日志与数据库扫描无密钥明文；接口响应不返回密钥；支持双 Key 灰度轮换"],
      ["版本一致性", "每日巡检主通道返回的模型版本与期望清单，不符时自动切兜底通道并告警"],
      ["账务对账", "日终与中转站账单核对，差异率 < 0.5%；超 2% 自动暂停该通道"],
    ],
    [20, 80]
  ));
  c.push(H("9.6 队列与熔断的 Java 实现要点", 2));
  c.push(P("后端为 Java 后，队列与熔断不手写状态机，直接用成熟组件，但需注意语义并非一一对应。以下为关键对齐结论，完整对照见《xin.ai 技术架构说明 V1》§2.2。"));
  c.push(T(
    ["语义项", "Java 实现", "关键约束"],
    [
      ["延迟任务", "Redisson RDelayedQueue", "底层 Redis ZSet，进程重启不丢；消费端需运行才能搬运到期元素，且单条不精确，须 DB tasks 记录 + watchdog 兜底扫描"],
      ["优先级", "每能力域拆 high / normal 双队列", "无原生等价，Worker 消费时先探 high 队列"],
      ["并发控制", "Redisson RSemaphore 分布式限并发", "不可只用本地信号量，否则多副本下总并发失控"],
      ["失败重试", "Resilience4j Retry + DB 死信表", "通道级重试与接入点级重试分开计数，不互相消耗配额"],
      ["幂等去重", "DB task_idempotency 唯一索引", "不可只依赖 Redis 去重，主从切换时可能失效"],
      ["熔断", "Resilience4j CircuitBreaker", "按 channel_id 一个实例；失败率 50% / 窗口 20 次 / 冷却 60s / 半开放 1 次探针"],
      ["死信与人工重投", "DB tasks 状态 FAILED + 重投接口", "落 DB 便于审计与对账"],
      ["定时巡检", "Quartz", "通道余额巡检、健康检查、日终对账"],
    ],
    [16, 30, 54]
  ));
  c.push(bullet("★ 总原则：DB 是任务状态的唯一真相源，队列只负责通知。任何「以队列消息为唯一真相」的设计在 Java 栈下都要重做，否则丢任务、重复扣费、进程重启三类事故无法避免。"));
  c.push(H("9.7 ★ 模型接入点后台配置", 2));
  c.push(P("每个模型（文生图 2K、文生视频 720P、数字人口播 60 秒 等）的接入点、密钥引用、超时、重试、限流、成本系数，全部存数据库并在管理后台可改。代码中不出现任何具体上游 URL，换接入点、换中转站、调模型版本都是后台操作，保存后 30 秒内生效，无需重启服务、无需重新部署。"));
  c.push(T(
    ["表", "作用", "关键字段"],
    [
      ["model_channels", "定义一条通道（一家中转站 / 一家官方厂商）", "base_url、secret_ref、priority、cost_ratio、circuit_state、balance"],
      ["model_endpoints", "★ 定义一个模型的接入点（模型 → 通道的具体映射）", "model_key、capability、channel_id、base_url、upstream_model、timeout_ms、max_retries、sort_order、config_json"],
      ["ability_pricing", "售价积分（后台可调，见 §8.3.1）", "model_key、spec、points、discount_rate、version"],
      ["model_channel_health", "通道与接入点的健康与版本巡检记录", "channel_id、model_key、probe_result、upstream_version、checked_at"],
      ["pricing_change_log", "售价变更审计", "points_before、points_after、margin_before、margin_after、operator、reason"],
    ],
    [20, 44, 36]
  ));
  c.push(P("★ 设计要点：① 通道与接入点分离——中转站只支持部分模型时，不支持的模型单独挂官方直连，互不影响；② `upstream_model` 与前台展示名分离——中转站叫 seedance-2.0、官方叫 doubao-seedance-2-0，前台始终显示统一名称；③ `sort_order` 决定同能力域内的降级顺序；④ 密钥本体存密钥管理服务，数据库只存 `secret_ref` 引用，数据库泄露不会导致密钥外泄；⑤ 后台提供「测试连通性」按钮，发一次最小成本探针，返回耗时、成功与否、上游返回的模型标识，同时用于版本一致性巡检。"));
  c.push(P("配置加载机制：服务启动时将 model_endpoints 与 model_channels 加载进内存缓存（Map<model_key, Endpoint>）；后台保存后主动失效对应 model_key 的缓存项，30 秒内新任务使用新配置。运行时 ChannelRouter 按 model_key 取 Endpoint，再取 channel_id 做熔断判定，最终调用 Adapter。"));
  c.push(P("★ 密钥安全边界：endpoint / 模型名 / 超时 / 优先级入库可改，但 API Key 永不入库明文，仅以 secret_ref 引用密钥管理服务；日志脱敏规则覆盖 api_key 与 authorization；接口响应不返回任何密钥字段。"));

  c.push(H("10. AI 能力实现说明", 1));
  c.push(H("10.1 文生图 / 图生图", 2));
  c.push(P("流程：提示词与参数 → 报价 → 冻结积分 → 提交上游 → 轮询任务 → 落库并转存到我方 OSS → 结算积分。参考图与蒙版先在服务端做预检（尺寸、格式、体积、是否含人脸），不合规直接拦截并提示，避免浪费上游额度。输出统一做 CDN 缩略图与 EXIF 清理。"));
  c.push(H("10.2 图生视频 / 文生视频", 2));
  c.push(P("流程同图片，但需处理三件特殊事项：①时长与分辨率对成本的非线性影响（4K 与 1080P 单价相差近 4 倍），报价必须按真实 Token 公式计算；②异步任务长（30 秒~5 分钟），需 SSE 推送进度并支持断线续查；③生成失败、审核拒绝、超时三类原因要分开提示，审核拒绝不扣费。"));
  c.push(H("10.3 智能对话（Agent）", 2));
  c.push(P("采用「对话 + 技能挂载」模式：用户在对话中描述需求，系统可调用图片、视频、文案等技能包生成中间产物并插入对话流。对话本身按 Token 计费（成本极低），技能调用按各能力自身积分计价。流式输出采用 SSE，消息体包含 content_parts 结构以承载图片、音频、技能结果引用。上下文管理：滑动窗口 + 摘要压缩，超过 32k 切换长上下文计价档位。"));
  c.push(H("10.4 数字人 / 音色", 2));
  c.push(P("两条链路：①图片口播 = 单图 + 音频 → 口型同步视频；②视频改口型 = 已有口播视频 + 新音频 → 口型匹配。音色支持系统音色、文生音色、克隆音色三类；克隆音色占用供应商槽位，按槽位收取一次性积分。提供「多语言配音」能力：中文原稿 → TTS 输出目标语言音频 → 改口型，一套素材多语种复用。"));
  c.push(H("10.5 视频处理", 2));
  c.push(P("擦除类功能采用「框选 → 区域坐标转换 → 提交供应商 → 异步回传」流程；前端使用 video.js 逐帧取帧并在 canvas 上绘制框选区域，坐标按短边分辨率归一化后传给供应商。画质增强类由 MediaKit 处理，输出规格可选择原分辨率或 4K。"));
  c.push(H("10.6 批次与断点续传", 2));
  c.push(P("商详套图、批量套图等场景采用「一次提交 N 条」的批次模型：批次内并行度受供应商 RPM 限制（Seedance 0.6k RPM、百炼 300 RPM），服务端按能力域限流调度；批次级展示总体进度，单条失败不影响其余条目，失败条目按单条结算。"));

  c.push(H("11. 石材行业专属模块", 1));
  c.push(P("本章为超出通用 AI 平台范围的行业能力，是本项目的差异化交付物。行业场景关键词：酒店大堂、宴会厅、前台、电梯厅、客房、别墅庭院、会所、展厅、幕墙、地面铺装、墙面干挂、背景墙、洗手台、楼梯踏步。"));
  c.push(H("11.1 石材材质库", 2));
  c.push(bullet("支持按品类（花岗岩/大理石/石英石/人造石/砂岩/木纹砖等）、纹理（大纹/细纹/水波纹/木纹/洞石）、色系（白/灰/黑/暖黄/木色）、应用部位（地面/墙面/台面/背景墙）建立多维标签。"));
  c.push(bullet("每块石材上传 1~6 张实拍图 + 规格参数（规格、产地、厚度、表面处理、吸水率），自动生成「材质卡」并可直接用于效果图生成的参考图。"));
  c.push(bullet("提供材质搜索、收藏、批量导出，作为石材行业专属的用户留存点。"));
  c.push(H("11.2 酒店大堂效果图生成", 2));
  c.push(P("这是石材行业最刚性的需求：客户已有石材样板，目标是「这套石材铺在大堂里是什么效果」。实现链路如下："));
  c.push(num("上传石材样板图（必填）+ 空间类型选择（大堂/宴会厅/前台/电梯厅/客房/庭院/会所/展厅）+ 风格参数（现代轻奢/欧式/新中式/极简/侘寂）+ 尺寸参数（大堂面积、层高、采光朝向）。"));
  c.push(num("系统做「材质锚定」：从样板图提取主色与纹理，生成结构化材质描述（石材名称、色号、纹理走向、粗糙度、光泽度），并把样板图作为高权重参考图，避免生成结果「像别的石材」。"));
  c.push(num("场景提示词由行业模板库拼装（空间结构 + 材质锚定 + 软装配置 + 灯光 + 视角），保证输出符合建筑空间的真实比例与透视。"));
  c.push(num("调模型：以 LC Image 2.5 Pro 输出 2K/4K 图，失败自动重试 1 次（换 seed 或换微调权重），重试仍失败则转人工精修队列。"));
  c.push(num("交付：效果图 + 可切换的 3 个视角版本（大堂全景 / 材质特写 / 人视角），支持 16:9、4:3、竖版三种画幅适配不同投放位。"));
  c.push(P("关键工程难点（须在设计阶段解决）：①材质一致性——通过参考图 + 结构化描述双锚定，并对结果做颜色直方图校验，偏差超阈值触发重生成；②空间合理性——通过空间模板约束比例与构件；③文字幻觉——效果图中的标识、导视牌须走「后期合成」而非让模型生成。"));
  c.push(H("11.3 石材场景模板包", 2));
  c.push(P("针对石材行业的典型应用空间，提供 14 类预置空间模板与软装灯光配置，模板化约束生成结果的构图与比例，避免每次生成都要用户从零描述。"));
  c.push(T(
    ["类别", "空间类型", "配置要点"],
    [
      ["公区", "大堂 / 宴会厅 / 前台 / 电梯厅 / 展厅", "层高与柱距约束、大面积铺装、背景墙主材占比、暖光色温"],
      ["客房", "客房 / 洗手台 / 楼梯踏步", "台面与墙面同材延伸、挡水与收口细节、柔光照明"],
      ["庭院", "庭院 / 会所", "户外耐候与防滑、绿化与水面反射、日景与夜景两套"],
      ["工程", "幕墙 / 地面铺装 / 墙面干挂 / 背景墙", "拼缝与对缝规则、模数排布、开放缝与密缝两种工艺"],
    ],
    [12, 44, 44]
  ));
  c.push(P("模板结构为「空间结构 + 材质锚定 + 软装配置 + 灯光 + 视角」的参数化拼装，后台可新增与调整，运营无需改代码。"));

  c.push(H("11.4 材质一致性校验与人工精修", 2));
  c.push(P("效果图最大的交付风险是「生成结果看起来像别的石材」。本章是 E5 功能点，解决一致性问题。"));
  c.push(bullet("自动校验：对生成结果与原样板图做颜色直方图偏差比对，超阈值自动触发重生成（换 seed 或调整材质锚定权重）。"));
  c.push(bullet("人工兜底：连续重生成仍不达标的任务转入人工精修队列，由设计人员接手，不占用客户额度。"));
  c.push(bullet("参数可调：材质锚定参数（主色权重、纹理走向描述、粗糙度/光泽度）开放给用户手动微调。"));
  c.push(bullet("交付 3 个视角版本：大堂全景 / 材质特写 / 人视角，适配 16:9、4:3、竖版三种投放位。"));

  c.push(H("11.5 ★ 石材厂家介绍视频", 2));
  c.push(P("面向石材展厅、展会与招商场景的厂家介绍视频，是本项目两条核心业务链路之一（对应报价单 E6）。业务形态与 da-ai.cc 的「同城到店 / 探店视频」高度同构，因此复用原站 local-store 类 4 套技能包的分镜与参数结构，替换行业变量为「产品名称、规格参数、应用场景、产地、优惠政策」，不另起炉灶。"));
  c.push(T(
    ["分镜", "内容", "生成方式", "参考规格"],
    [
      ["镜头 1", "厂房 / 展厅 空镜 + 材质大特写推进", "图生视频（素材实拍图 → 运镜）", "720P 5 秒"],
      ["镜头 2", "数字人主口播：产品与工艺介绍", "Wan2.2-S2V 图片口播（数字人形象 + 克隆音色 TTS）", "720P 40 秒"],
      ["镜头 3", "应用场景实拍（大堂 / 铺装 / 幕墙）", "图生视频（效果图 → 推轨/环绕）", "720P 10 秒"],
      ["镜头 4", "品牌与规格信息板", "模板视频合成（文字后期叠加）", "程序合成"],
      ["成片", "拼接 + 转场 + 字幕 + 片头 + BGM", "FFmpeg 合成", "1080P 输出"],
    ],
    [12, 34, 34, 20]
  ));
  c.push(P("定价按「每条 60 秒 320 积分（标准版）/ 165 积分（480P 轻量版）」，脚本与数字人形象可复用摊薄成本。字幕与片头走程序合成，避免模型生成文字导致乱码。"));

  c.push(H("11.6 石材行业脚本与提示词模板库", 2));
  c.push(P("内置石材行业脚本模板（产品介绍、展会邀约、矿区与工艺讲解、客户接待话术），支持变量替换（石材名称、规格、优势、促销信息），后台可配置，运营可自助新增。"));

  c.push(H("11.7 石材模块的成本与毛利", 2));
  c.push(T(
    ["功能", "售价（积分）", "真实成本（元）", "毛利率", "备注"],
    [
      ["石材空间效果图（单张 2K）", "8", "1.40", "82%", "LC Image 2.5 Pro 2K $0.05 + 2 次重试摊销"],
      ["石材空间效果图（4K 高精版）", "12", "1.50", "88%", "LC Image 2.5 Pro 4K $0.08"],
      ["石材空间批量出图（6 张套 2K）", "45", "3.65", "92%", "批量有规模效应"],
      ["厂家介绍视频（60 秒 标准版）", "320", "95.73", "70%", "数字人 40 秒 + 场地空镜 15 秒 + TTS + 字幕"],
      ["厂家介绍视频（60 秒 480P 轻量）", "165", "48.62", "71%", "Wan2.2-S2V ¥0.5/秒 + TTS"],
      ["石材数字人口播（60 秒 720P）", "235", "70.37", "70%", "Wan2.2-S2V ¥0.9/秒 + TTS"],
      ["加权平均", "—", "—", "≈73%", "行业类高于通用能力平均（≈57%），覆盖人工兜底与模板调优"],
    ],
    [34, 16, 16, 12, 22]
  ));

  c.push(H("12. 非功能需求", 1));
  c.push(T(
    ["类别", "指标要求"],
    [
      ["可用性", "核心链路（登录、报价、提交任务、扣费）月可用性 ≥ 99.9%；任务生成成功率 ≥ 97%（不含上游审核拒绝）"],
      ["并发", "注册用户 10,000，日活 1,000；同时在线 300；同时生成任务 100（可按供应商 RPM 动态扩缩）"],
      ["扩展性", "新增一个模型适配器 ≤ 2 人日；新增一个技能包（图片或视频模板）≤ 1 人日，由后台配置化完成"],
      ["安全", "密码加盐哈希；Token 短期有效 + 可强制下线；接口全量鉴权与权限校验；上传文件类型与内容校验；敏感操作二次确认与审计留痕"],
      ["合规", "ICP 备案（内地服务器）、等保二级（可选）、隐私政策与用户协议、内容安全审核（文本 + 图片 + 视频）、未成年人保护、个人信息收集清单"],
      ["备份", "数据库每日全量 + 增量，保留 30 天；对象存储跨区域备份；RPO ≤ 1 小时，RTO ≤ 4 小时"],
      ["日志", "全链路 trace_id；关键业务日志保留 180 天；日志脱敏（手机号、身份证、银行卡）"],
      ["无障碍", "关键页面符合 WCAG AA 基本要求；编辑器支持键盘操作"],
    ],
    [14, 86]
  ));

  c.push(H("13. 实施优先级与降级预案", 1));
  c.push(P("本项目按「全量复刻、一项不减」实施（对应报价单套餐三，287 人天 / 12 周）。下表不是删减清单，而是当工期受压、模型供应商接口变动或人力不足时的降级预案：优先保证 P0 项按期交付，P1 项可顺延至二期，P2 项在极端情况下简化实现。"));
  c.push(T(
    ["模块", "复杂度原因", "优先级", "降级预案（如工期受压）", "节省"],
    [
      ["云端 Agent 沙箱（Pod/线程/轮次 + 命令执行 + MCP 安装）", "等于自建 E2B/Modal 级容器编排运行时", "P1", "降级为「对话内技能挂载 + 后台任务编排」，覆盖约 90% 场景，沙箱运行时延至二期", "6~10 人周"],
      ["多节点自由画布（节点/连线/图层 + 修订冲突处理）", "前端图形编辑器 + 冲突合并，后端工作量大于前端", "P0", "保留节点连线核心；版本冲突处理由后端 last-write-wins 简化，不做三方合并", "2~3 人周"],
      ["联盟分销（16 接口含提现结算、合规审核）", "涉及资金结算与合规资质，最吃审批与风控", "P1", "保留推广码归因与佣金计算；提现结算延至二期，先走人工打款", "4~6 人周"],
      ["发票与开票资质", "需企业资质与税务系统对接", "P2", "实现申请单 + 后台人工开票，不接第三方自动开票接口", "2 人周"],
      ["6 套主题预设与后台自定义换肤", "纯资产工作量大，运营价值低", "P2", "优先交付 CSS 变量体系 + 3 套预设，其余后台配置化", "1~2 人周"],
      ["19 个视频技能包 / 11 个图片技能包的 prompt 调优", "含大量行业 prompt 调优与验收", "P0", "技能包框架与全部选项组 1:1 复刻；行业 prompt 调优分批交付，首批交付 8+8 套并提供模板后台自助新增", "3~4 人周"],
      ["模型路由精细化运营（13 能力域全量开关）", "运营复杂度高，易配错价", "P0", "13 能力域全部接入并保留开关字段；后台可视化开关界面优先交付 8 个核心域", "1 人周"],
      ["深度复刻的运镜轨迹还原精度", "需逐帧动作与轮廓解析，效果依赖上游模型", "P1", "先交付「资产替换 + 参数套用」主链路，轨迹还原精度随模型迭代优化", "2~3 人周"],
      ["充值卡与积分转赠", "涉及防刷与对账", "P2", "保留充值卡；积分转赠延至二期", "3~5 人天"],
      ["多语言 / 海外站点", "双倍内容与合规工作量", "不实施", "预留 i18n 词条结构，不在本期范围", "2 人周"],
    ],
    [22, 24, 10, 30, 14]
  ));
  c.push(P("说明：① 降级预案由平台方运营负责人决策启用，启用任一项须走变更流程同步本文档；② P0 项构成「一个都不能少」的底线——原站已确认的路由、接口、模型键、技能包、后台页签均属 P0，不得删减；③ 本表所列节省量是机动余量，不是默认扣减项。"));

  c.push(H("14. 交付物与验收标准", 1));
  c.push(H("14.1 交付物清单", 2));
  c.push(T(
    ["类别", "交付物"],
    [
      ["软件", "前端应用（Next.js + TypeScript）、后端服务与异步任务执行器（Spring Boot 3.5 / Java 21）、管理后台、部署脚本（Docker + CI/CD）"],
      ["文档", "需求规格说明书（本文档）、接口文档（OpenAPI）、数据库设计说明、部署运维手册、用户操作手册、管理员手册"],
      ["测试", "测试用例集、测试报告、压测报告、安全自查报告"],
      ["资产", "行业技能包与模板（图片 8 套 / 视频 8 套 / 石材模板 4 套）、UI 切图与图标、品牌色板与主题变量"],
      ["培训", "2 场内部培训（业务操作 / 运营后台）+ 1 份录播视频"],
      ["内部", "中转站接入需求与采购清单、渠道配置与密钥轮换手册、定价变更审计台账"],
    ],
    [16, 84]
  ));
  c.push(H("14.2 验收标准", 2));
  c.push(bullet("功能验收：按第 3 章功能清单逐项验收，致命/严重缺陷为 0，一般缺陷 ≤ 5 且有明确修复计划。"));
  c.push(bullet("性能验收：达到第 12 章指标，附 Lighthouse 与压测报告。"));
  c.push(bullet("计费验收：随机抽取 20 个能力场景，验证「报价 = 实际扣费」，误差为 0；失败任务验证积分全额退回。"));
  c.push(bullet("安全验收：完成一次第三方或内部安全扫描，高危漏洞为 0。"));
  c.push(bullet("文档验收：文档齐备，运维手册可让运维方在无开发参与的情况下完成部署与扩缩容。"));
  c.push(bullet("试运行：连续试运行 15 个自然日，无重大故障，日均任务成功率 ≥ 95%。"));

  c.push(H("14.3 ★ 分步交付与阶段验收（自营版）", 2));
  c.push(P("自营平台不一次性交付全部功能，而是按「每阶段独立可上线运营、独立可验收」的方式推进。这样做的三个好处：① 阶段一结束即可开始收费运营，早期就有现金流与真实用户反馈；② 每阶段范围收窄，质量可控，避免一次性交付 287 人天范围带来的进度失控；③ 每阶段都有明确的量化验收点，不达标可立即止损调整范围。"));
  c.push(P("★ 全量功能范围一项不减（仍是 287 人天 / 37 个功能点），只是按阶段拆开交付与验收，总周期仍为 12 周。各阶段范围与人天见下表。"));
  c.push(T(
    ["阶段", "范围", "人天", "周期", "本阶段可上线运营的能力", "验收关口"],
    [
      ["S1 · 最小可运营闭环", "A 全 + B1/B2/B3 + D 全 + E1~E7", "189", "第 1–9 周", "登录注册、素材库、图片与视频生成、数字人与音色、石材材质库与效果图、厂家介绍视频、积分充值与扣费、后台基础框架", "★ 能真实收费：真实账号完成充值 → 生成 → 扣费 → 退款闭环；出图 ≥ 50 张、出视频 ≥ 10 条，成功率 ≥ 90%；石材效果图 ≥ 20 张通过评审"],
      ["S2 · 渠道与商业化", "B4~B8 + E8~E12", "58", "第 5–11 周（与 S1 并行）", "剪辑台、画质增强、字幕水印擦除、爆款复刻与重组、联盟分销、发票、后台 20 页签、发现流、推荐与公告", "★ 中转站接入完成并通过专项验收（§9.5 八项全绿）；售价积分后台可配并实测改价生效；毛利日报能拆到能力/通道/模型三级"],
      ["S3 · 画布与 Agent", "C1~C4", "40", "第 7–12 周", "画布编辑器与分组模板、Agent 对话与技能挂载、Agent Cloud 云端沙箱", "画布与 Agent 联调通过；全链路压测达标；全功能上线并出具最终验收报告"],
    ],
    [14, 18, 7, 13, 24, 24]
  ));
  c.push(P("阶段验收规则：① 每阶段验收以本表「验收关口」列的量化指标为准，不接受「可演示」等主观描述；② 每阶段验收通过后，该阶段功能立即具备独立运营价值，不依赖后续阶段；③ 阶段验收不通过时，优先在该阶段内修复与调整范围，不顺延后续阶段的开发；④ 每阶段验收通过即视为该阶段人天结算完成，与阶段付款节点一一对应；⑤ S2 的中转站专项验收为硬性关口，未通过则视频类能力不得对外开放（先走官方直连）。"));
  c.push(P("阶段付款节点（与 §7 付款方式对应）：S1 验收通过付 60%，S2 验收通过付 25%，S3 验收通过并上线后付 15%（尾款含 3 个月质保）。预付款 15% 于立项时支付。本项目为平台方自有资金投入，上述比例是从内部资金占用与阶段产出节奏角度设定的管理基线。"));

  c.push(H("15. 工期与里程碑（12 周 ≈ 2~3 个月）", 1));
  c.push(P("以投入团队 3~5 人（按阶段动态投入：S1 阶段 3 人、S2 阶段 4 人、S3 阶段 5 人）估算，叠加 AI 辅助编码与既有逆向成果复用（45 个前端 chunk 源码已解析、89 个接口契约已确认、供应商价格已实测），总工期 12 周（不含等待备案与支付资质的时间）。产能校验：287 人天 ÷ 60 个工作日 ≈ 4.8 人满负荷，与上述配置一致。阶段划分与各阶段验收关口见 §14.3。"));
  c.push(T(
    ["阶段", "周期", "交付内容", "里程碑"],
    [
      ["P0 立项与设计", "W1", "需求确认、原型、UI 视觉、接口契约、数据库设计、模型通道选型与压价", "需求确认书签署"],
      ["P1 基础外壳", "W2–W4", "门户、工具箱、登录、资产库直传、任务队列、模型路由、积分扣费闭环、后台基础框架", "Alpha：可登录可上传可跑通一条生成链路"],
      ["P2 核心生成能力", "W4–W7", "图片生成与 11 套技能包、视频生成与 19 套技能包、分段重生成与剪辑台、画质增强、字幕与水印擦除、深度复刻、一键裂变", "Beta：报价 = 扣费，误差为 0"],
      ["P3 数字人与音色", "W6–W9", "形象库、音色克隆与设计、TTS/ASR、图片口播、视频改口型、授权留痕", "数字人成片通过客户评审"],
      ["P4 石材专属模块", "W8–W10", "材质库、大堂效果图、14 类场景模板、一致性校验与人工精修、厂家介绍视频、行业脚本库", "石材场景 Demo 通过客户评审"],
      ["P5 画布与 Agent", "W8–W10", "画布编辑器与分组模板、Agent 对话与技能挂载、Agent Cloud 云端沙箱", "画布与 Agent 联调通过"],
      ["P6 商业化与后台", "W10–W11", "充值套餐、订单、发票、用量看板、风控、联盟分销、发现流、管理后台 20 页签", "后台全页签可操作"],
      ["P7 联调与压测", "W11–W12", "全链路联调、压测、安全加固、缺陷收敛", "RC 版"],
      ["P8 上线与试运行", "W12", "部署上线、备案落地、监控告警、培训、试运行启动", "正式上线 + 验收报告"],
    ],
    [18, 12, 46, 24]
  ));
  c.push(P("说明：① 12 周为全量复刻版的压缩工期，达成条件为 3~5 人团队投入 + AI 辅助编码全程使用 + 需求确认与素材提供及时；② 各阶段并行推进，阶段划分与验收关口见 §14.3；③ 若需压缩至 2 个月（8 周），须增配 1 名全栈，增配费用按 ¥1,000/人天另计，工期相应顺延；④ 试运行 15 天为上线后观察期，不占用开发工期；⑤ 中转站专项验收（§9.5）为 S2 阶段硬性关口，未通过则视频类能力不开放。"));
  c.push(H("15.1 变更控制", 2));
  c.push(bullet("需求变更须提交变更申请单，评估对工期、成本、既有功能的影响，经双方项目经理签字生效。"));
  c.push(bullet("累计变更工作量超过 10 人天时，按变更单价另计费用；未涉及工作量变更的功能性调整（如文案、配色、参数默认值）在质保期内免费处理。"));
  c.push(H("15.2 风险登记", 2));
  c.push(T(
    ["风险", "影响", "概率", "应对措施"],
    [
      ["上游模型涨价或限流", "毛利下降、任务失败率上升", "中", "双供应商冗余、路由表快速切换、熔断告警"],
      ["内容审核误伤", "用户投诉、生成失败", "中", "多轮审核 + 人工复核队列 + 失败全额退积分"],
      ["中转站不稳定或跑路", "视频类能力全站不可用，或成本失控", "高", "官方直连作为兜底通道自动降级；熔断与半开探测；预充值余额三级告警；至少评估 2 家中转站做切换预案；合同留随时切换权"],
      ["中转站模型版本与官方不一致", "出片质量波动、效果不稳定", "中", "每日版本巡检，不符自动切兜底通道；敏感能力域默认官方直连"],
      ["中转站记录用户素材与 prompt", "商业机密泄露风险", "中", "采购前确认数据留存策略；无法确认的能力域不走中转；用户协议明示素材将提交第三方处理"],
      ["ICP 备案 / 支付资质延迟", "上线延期", "中", "P0 阶段即启动；先在境外/测试环境完成功能验收，备案通过后切内地"],
      ["石材效果一致性不达标", "客户验收受阻", "中", "先做 20 组真实样板的效果基准测试，确定模型与提示词模板后再批量开发"],
      ["需求持续扩张", "工期失控", "高", "以第 3 章功能清单为唯一范围基准，超出即走变更流程"],
      ["单一供应商依赖", "议价能力弱", "中", "每类能力至少接入 2 家供应商"],
    ],
    [22, 22, 8, 48]
  ));

  c.push(H("16. 运维交接与持续成本", 1));
  c.push(P("平台上线后的年度固定支出（不含模型调用量费用）按下表估算。这部分在自营模式下直接进入平台方的运营成本，不再单列给任何第三方："));
  c.push(T(
    ["项目", "首年（元）", "续费年（元）", "说明"],
    [
      ["域名（.com）", "85", "95", "含 DNS 解析；可加购 .cn 备用域名"],
      ["云服务器（应用 + Worker）", "2,000", "2,500", "轻量 4C8G + 弹性 Worker，按量扩缩"],
      ["对象存储与 CDN 流量", "1,200", "2,500", "首年 1TB 流量，超出按量（视频为主）"],
      ["数据库 RDS（高可用）", "2,400", "2,600", "MySQL 2C4G 高可用版"],
      ["Redis", "300", "360", "1G 标准版"],
      ["短信服务", "2,000", "2,000", "约 12 万条验证码 + 通知"],
      ["SSL 证书", "0", "0", "免费 DV 证书；商业证书另计"],
      ["内容安全审核", "600", "1,200", "文本 + 图片审核"],
      ["监控与日志", "800", "1,000", "Sentry 商业版 + 日志存储"],
      ["备案（ICP）", "0", "0", "备案本身免费；要求服务器包月 ≥ 3 个月"],
      ["合计（固定）", "9,385", "12,255", "不含模型调用费用"],
    ],
    [26, 16, 16, 42]
  ));
  c.push(P("模型调用费用按实际用量结算，属于经营性成本，由平台收入覆盖，不在固定年费内。建议与模型供应商签订年度框架协议并采购资源包（视频类 20 万分钟级、语音类 50 万字符级），可较刊例价再降 20%~30%。"));

  return baseDoc(c, "AI 视频创作平台 开发规格说明书", "积分计费 · 模型供应链 · 石材行业模块");
}

/* =========================================================================
   DOC 2 : 商务报价单
   ========================================================================= */
function buildQuoteDoc() {
  const c = [];
  const ALL_MD = TOTALS.all;
  const ALL_AMT = ALL_MD * DAY_RATE;

  c.push(...cover(
    "软件开发项目报价单",
    "DAAI 同款 AI 内容创作平台全量复刻 + 石材行业模块",
    [
      ["报价方", "攸跃秦网络工作室"],
      ["委托方", "（甲方）客户名称"],
      ["项目名称", "AI 视频与商品图生成平台 · 全量复刻 + 石材行业专属模块"],
      ["对标基准", "https://susu.da-ai.cc/（已完成后端接口与前端路由全量逆向）"],
      ["报价日期", "2026-10-29"],
      ["报价有效期", "自报价日起 30 个自然日"],
      ["报价版本", "V4.0（全量复刻版 · 12 周交付）"],
      ["计价方式", "按功能点（人天）计价，人天单价 ¥500"],
      ["文档编号", "QUO-AIVC-2026-004"],
    ],
    "QUO-AIVC-2026-004", "2026-10-29", "V4.0"
  ));

  c.push(H("一、报价总览", 1));
  c.push(P(`本项目按功能点拆分报价，全量复刻合计开发工作量 ${ALL_MD} 人天，人天单价 ¥${DAY_RATE}，折合软件开发费 ${money(ALL_AMT)}（不含税）。第三方资源与年度持续费用单独列示，不计入上述开发费。工期 12 周（约 2~3 个月）。`));
  c.push(T(
    ["序号", "费用类别", "金额（元）", "说明"],
    [
      ["A", "软件开发费（功能点计价）", money(ALL_AMT), "详见第二节功能点明细"],
      ["B", "第三方一次性接入与代采费用", "3,000 ~ 7,000", "详见第四节，多为代采性质，可据实调整"],
      ["C", "首年运行资源预付（由甲方直接支付服务商）", "14,024", "详见第五节，逐年列示"],
      ["D", "合计（本期需支付开发方）", money(ALL_AMT + 7000), "A + B 上限"],
      ["E", "运维服务费（可选，第二年起）", "18,000 / 年起", "详见第六节；首年 3 个月质保期免费"],
    ],
    [8, 40, 20, 32]
  ));
  c.push(P("说明：① 上表中 C 项为客户自有基础设施成本，由客户直接向云服务商与域名注册商支付，乙方仅提供采购建议与代操作，不计入开发费；② 模型 API 调用费用属于平台经营性成本，按实际使用量结算，由平台收入覆盖，不在本次报价范围内，若甲方希望由乙方代为采购并垫付，可另行签订《模型资源代采协议》；③ 若甲方采用下文「套餐方案」中的缩减范围，开发费按对应比例下调。"));
  c.push(P("税务说明：本报价所列开发费不含税。乙方为个体工商户，可开具增值税普通发票；如甲方需要增值税专用发票，由甲方在税务平台自行代开或委托第三方机构代开，相关税费由甲方承担。"));
  c.push(P("模型资源与计费关系：① 本平台采用统一的「积分」计价，积分售价已包含模型调用成本与平台服务成本，用户按积分充值、按生成消耗积分；② 用户亦可在「账户中心 → API Key」中绑定自有模型服务账号，此时该次生成不消耗积分、亦不收取算力服务费，模型费用由用户自行承担，平台不赚取模型差价，此为用户可选模式，不影响平台功能完整性；③ 无论采用何种模式，平台各能力的功能范围、交付质量与验收标准完全一致，不因模式不同而降低；④ 平台默认以自有资源池向模型服务商批量采购（资源包 / 框架协议），该部分成本已计入积分定价的成本口径内，如甲方希望由乙方代为采购并垫付，另签《模型资源代采协议》，按代采实付金额收取 5%~10% 管理服务费。"));
  c.push(P("人力投入：本项目投入团队规模为 3~5 人（按里程碑动态投入，非全程满编），并发产能为三期分别 3 人 / 4 人 / 5 人，人天单价 ¥500 已覆盖人力投入成本与乙方的项目管理、系统集成、联调测试、交付验收及质保成本。详见第八节。"));

  c.push(H("二、功能点报价明细", 1));
  c.push(P("计价单位为人天（1 人天 = 8 小时）。下表按「模块块 → 功能点」逐条列示，可作为验收与结算依据。标 ◇ 者为可选功能项，由甲方自行决定是否勾选，详见 §2.1。"));

  const rows = [];
  for (const [prefix, gname, items] of BLOCKS) {
    let gs = 0;
    for (const [no, fn, desc, md] of items) {
      gs += md * DAY_RATE;
      const isOpt = OPTIONAL_IDS.includes(no);
      rows.push([
        isOpt ? `◇ ${no}` : no,
        isOpt ? `${fn}（可选）` : fn,
        desc,
        String(md),
        money(md * DAY_RATE),
      ]);
    }
    rows.push([
      { __p: [new Paragraph({ spacing: { after: 0 }, children: [t(`${prefix} 块合计`, { bold: true })] })] },
      "", "",
      { __p: [new Paragraph({ spacing: { after: 0 }, alignment: AlignmentType.RIGHT, children: [t(String(items.reduce((a, b) => a + b[3], 0)), { bold: true })] })] },
      { __p: [new Paragraph({ spacing: { after: 0 }, alignment: AlignmentType.RIGHT, children: [t(money(gs), { bold: true })] })] },
    ]);
  }
  rows.push([
    { __p: [new Paragraph({ spacing: { after: 0 }, children: [t("开发费合计", { bold: true, color: "FFFFFF" })] })] },
    "", "",
    { __p: [new Paragraph({ spacing: { after: 0 }, alignment: AlignmentType.RIGHT, children: [t(String(ALL_MD), { bold: true, color: "FFFFFF" })] })] },
    { __p: [new Paragraph({ spacing: { after: 0 }, alignment: AlignmentType.RIGHT, children: [t(money(ALL_AMT), { bold: true, color: "FFFFFF" })] })] },
  ]);
  c.push(T(["编号", "功能点", "功能说明", "人天", "金额（元）"], rows, [7, 22, 47, 8, 16]));
  c.push(P(`注：分组小计行与合计行以底色标注；合计 ${money(ALL_AMT)} 对应 ${ALL_MD} 人天。`, { size: 18, color: "5A7079" }));

  c.push(H("2.1 可选功能项（由甲方勾选）", 2));
  c.push(P(`下列 ${OPTIONAL_IDS.length} 项功能涉及资金结算、发票开具等需额外资质或人工兜底的能力，甲方可自行决定首期是否纳入。勾选则计入总价，未勾选则不计入、不单独收费，可作二期追加。`));
  c.push(T(
    ["编号", "功能点", "功能说明", "人天", "金额（元）", "如不勾选的替代方案"],
    OPTIONAL_IDS.map((no) => {
      const it = BLOCK_E.find((x) => x[0] === no);
      const alt = no === "E8"
        ? "首期不做分销体系，甲方自行以线下方式拓客；不影响积分计费与充值主链路"
        : "首期由甲方人工开具发票（平台「发票与开票」模块不启用），不影响积分充值与对账";
      return [`◇ ${no}`, `${it[1]}（可选）`, it[2], String(it[3]), money(it[3] * DAY_RATE), alt];
    }),
    [7, 18, 33, 7, 13, 22]
  ));
  c.push(T(
    ["勾选方式", "人天", "金额（元）"],
    [
      ["全部勾选（= 方案三全量复刻）", `${TOTALS.all} 人天`, money(TOTALS.all * DAY_RATE)],
      [`不勾选可选项（E8 + E9 共 ${OPTIONAL_MD} 人天）`, `${TOTALS.withoutOptional} 人天`, money(TOTALS.withoutOptional * DAY_RATE)],
    ],
    [52, 20, 28]
  ));
  c.push(P("说明：可选功能项与第三节套餐方案可叠加勾选——例如选择「方案二」后再勾选 E8 与 E9，即得方案二 + 可选项的完整范围与金额。"));

  c.push(H("三、套餐方案（可选范围）", 1));
  c.push(P("若甲方希望压缩首期投入，可选择下列方案。三者功能范围互斥，选定后按方案金额结算，未纳入范围的功能可在二期追加。"));
  c.push(T(
    ["方案", "包含范围", "开发费（元）", "人天", "工期"],
    [
      ["方案一 · 快速上线版", "A + B1/B2/B3 + D 全 + E1~E7", money(TOTALS.pkg1 * DAY_RATE), `${TOTALS.pkg1} 人天`, "9 周"],
      ["方案二 · 行业推荐版 ★", "A + B + D + E1~E7 + E10 + E11", money(TOTALS.pkg2 * DAY_RATE), `${TOTALS.pkg2} 人天`, "11 周"],
      ["方案三 · 全量复刻版 ★★", "A + B + C + D + E 全量", money(TOTALS.pkg3 * DAY_RATE), `${TOTALS.pkg3} 人天`, "12 周"],
    ],
    [18, 38, 16, 12, 12]
  ));
  c.push(P("说明：① 方案三为全量复刻，完全对齐 susu.da-ai.cc 现有前后端功能，一项不减，是本次推荐方案；② 三个方案均在 12 周内交付完成；③ 客户亦可完全按第二节逐项勾选，自行组合范围；④ 方案三的交付按 §3.1 分三期推进，E8 与 E9 为可选勾选项，剔除后减 ¥" + (OPTIONAL_MD * DAY_RATE).toLocaleString("zh-CN") + "。"));

  c.push(H("3.1 方案三交付分期", 2));
  c.push(P("方案三功能范围一项不减，但按交付顺序分三期推进。三期总价已合并计入方案三总价，甲方不需额外付费；甲方可在任一期验收通过后选择暂停后续两期，已完成部分据实结算，剩余部分顺延至二期实施。"));
  c.push(T(
    ["期次", "范围", "人天", "周期", "交付后可实现的能力"],
    [
      ["一期 · 核心闭环", "A 全 + B1/B2/B3 + D 全 + E1~E7", `${TOTALS.phase1} 人天`, "第 1–9 周", "平台底座、图片与视频生成、数字人与音色、石材材质库与效果图、厂家介绍视频——两条核心业务链路可商用"],
      ["二期 · 增强与商业化", "B4~B8 + E8~E12", `${TOTALS.phase2} 人天`, "第 5–11 周（与一期部分并行）", "剪辑台、画质增强、字幕水印擦除、爆款复刻与重组、分销、发票、后台 20 页签、发现流"],
      ["三期 · 画布与 Agent", "C1~C4", `${TOTALS.phase3} 人天`, "第 7–12 周", "画布编辑器与分组模板、Agent 对话与技能挂载、Agent Cloud 云端沙箱"],
      ["合计", `全量 37 个功能点`, `${TOTALS.phase1 + TOTALS.phase2 + TOTALS.phase3} 人天`, "第 1–12 周", "与方案三总价一致"],
    ],
    [15, 26, 10, 17, 32]
  ));
  c.push(P("说明：① 技术难度最高的 C 块（画布编辑器 14 人天 + Agent Cloud 沙箱 12 人天）排在三期，原因是其依赖前序的模型路由与生成能力，一期完成后启动可显著降低返工风险；② 三期之间存在并行，一期验收通过时二期与三期已开发过半，总工期仍为 12 周；③ 甲方若选择只做一期，总工期 9 周，后续两期可另行签订；④ 各期付款节点见第七节，与分期一一对应。"));

  c.push(H("四、第三方一次性费用（代采/代办）", 1));
  c.push(P("以下为项目落地必须发生的一次性支出，由乙方代为采购或代办，费用据实结算，多退少补。"));
  c.push(T(
    ["序号", "项目", "金额（元）", "说明"],
    [
      ["1", "甲方主体资质认证与支付通道开通", "0", "由甲方以自身主体自行办理，乙方协助准备材料，无额外费用"],
      ["2", "SSL 商业证书（如需 EV）", "0 ~ 4,000", "免费 DV 证书即可上线，选购商业证书则另计"],
      ["3", "对象存储/域名实名与初配", "0", "在第五节年度资源内"],
      ["4", "平台内发票与开票功能接入（E9）及首年调用", "1,000", "指平台「发票与开票」功能对接第三方开票服务，与乙方自身开具发票无关；若采用后台人工开票则免"],
      ["5", "模型供应商账号开通与首笔资源包", "2,000", "预付性质，可冲抵后续调用"],
      ["合计", "—", "3,000 ~ 7,000", "—"],
    ],
    [8, 40, 22, 30]
  ));

  c.push(H("五、年度持续费用（甲方直接支付，不由开发方收取）", 1));
  c.push(P("下列费用属于网站运营的基础设施支出，须每年持续支付，单独列示，便于甲方掌握长期持有成本。"));
  c.push(T(
    ["序号", "项目", "首年（元）", "续费（元）", "支付对象", "说明"],
    [
      ["1", "域名（.com + .cn 保护性）", "124", "133", "域名注册商", "含 DNS 解析与 SSL 自动续签"],
      ["2", "云服务器（应用 + 任务执行器）", "4,800", "5,200", "云服务商", "2 台 4C8G，Worker 按量扩缩"],
      ["3", "对象存储 + CDN 流量", "2,400", "3,600", "云服务商", "视频为主，约 2TB/月"],
      ["4", "云数据库（高可用）", "2,400", "2,600", "云服务商", "MySQL 2C4G 高可用"],
      ["5", "Redis 缓存", "300", "360", "云服务商", "1G 标准版"],
      ["6", "短信服务（验证码 + 通知）", "2,000", "2,000", "云服务商", "约 12 万条/年"],
      ["7", "内容安全审核", "1,200", "2,000", "云服务商", "文本 + 图片 + 视频"],
      ["8", "监控与日志服务", "800", "1,000", "第三方", "错误监控 + 日志存储"],
      ["9", "ICP 备案", "0", "0", "管局", "备案免费；要求服务器包月 ≥ 3 个月"],
      ["合计", "—", "14,024", "16,893", "—", "不含模型 API 调用费"],
    ],
    [6, 22, 11, 11, 14, 36]
  ));
  c.push(P("模型 API 调用费：按平台实际用量结算，由平台积分收入覆盖。若甲方要求由乙方统一代采，可另签《模型资源代采协议》，按实际用量 5% 收取管理服务费。"));

  c.push(H("六、运维与技术支持", 1));
  c.push(T(
    ["服务级别", "服务内容", "响应时限", "费用"],
    [
      ["首年质保（赠送）", "缺陷修复、模型接口变更适配、配置调整、远程支持", "严重故障 4 小时；一般 1 个工作日", "已含在开发费中（上线后 3 个月）"],
      ["基础运维（可选）", "监控值守、备份检查、安全补丁、每月巡检报告、季度报告", "严重 4 小时；一般 1 个工作日", "¥18,000 / 年"],
      ["功能级维护（可选）", "对应模块 Bug 修复、模型供应商接口升级、新增 1~2 个技能包 / 模板", "严重 4 小时；一般 1 个工作日", "所选功能开发费 × 8% / 年"],
      ["新增功能 / 需求变更", "范围外的新增开发", "即时报价", "¥1,000 / 人天"],
    ],
    [18, 42, 24, 16]
  ));
  c.push(P("运维费按「功能」与「服务类型」两条线分别计价，不打包成高额年费。质保期与运维服务期重叠时，运维服务费用按 50% 折算抵扣；不含新增功能开发、模型调用费与第三方账单。"));

  c.push(H("七、付款方式与里程碑", 1));
  const pay = [
    ["1. 签约预付款", "15%", money(ALL_AMT * 0.15), "合同签订、需求确认书签署后 5 个工作日内", "项目启动、需求确认"],
    ["2. P1 底座验收款", "20%", money(ALL_AMT * 0.2), "系统部署至甲方自有服务器；甲方用真实账号完成「注册登录 → 素材上传 → 充值 → 提交任务 → 积分扣费 → 失败退款」完整闭环", "P1 底座与通用框架"],
    ["3. P2 生成能力验收款", "20%", money(ALL_AMT * 0.2), "以甲方提供的素材真实产出图片 ≥ 50 张、视频 ≥ 10 条（覆盖图片生成 / 视频生成 / 视频处理三类），任务成功率 ≥ 90%", "P2 图片、视频与处理全套能力"],
    ["4. P3 核心业务验收款", "20%", money(ALL_AMT * 0.2), "以甲方提供的数字人形象照与录音，真实产出口播视频 ≥ 3 条、改口型视频 ≥ 2 条；石材空间效果图 ≥ 20 张并通过甲方内部评审", "P3 数字人与音色、P4 石材专属模块"],
    ["5. 上线验收与质保尾款", "25%", money(ALL_AMT * 0.25), "全部功能可用、全套文档与源码交付、培训完成；3 个月质保期满且无未关闭的严重缺陷", "P5~P8 全部功能与质保履约"],
  ];
  c.push(T(["节点", "比例", "金额（元）", "付款条件（验收标准）", "对应交付"], pay, [16, 9, 15, 34, 26]));
  c.push(P("说明：① 每期款项均以甲方现场或书面确认的验收结论为前提，验收标准以上表「付款条件」列为准，不以「可演示」等主观描述替代；② 每期验收要求系统部署在甲方自有服务器或甲方可访问的测试环境，确保交付后甲方具备独立掌控能力；③ 第 5 项质保尾款可选择银行保函或质保期内存续的服务抵用券替代；④ 如甲方在任一验收节点提出超出第二节功能清单的需求，按第十节变更流程另行计费，不影响本期款项支付条件；⑤ 本表按方案三全量 287 人天测算，若甲方选用其他方案或剔除 §2.1 可选项，各期比例不变，金额按实际勾选总价等比折算。"));

  c.push(H("八、项目周期", 1));
  c.push(T(
    ["阶段", "周期", "主要交付", "所属期次"],
    [
      ["P0 立项与设计", "第 1 周", "需求确认书、原型、视觉、接口契约、数据库设计、模型通道选型", "一期"],
      ["P1 基础外壳", "第 2–4 周", "门户、工具箱、登录、资产库、任务队列、积分扣费闭环、后台框架（Alpha）", "一期"],
      ["P2 核心生成能力", "第 4–7 周", "图片/视频/处理全套能力 + 19 套视频技能包 + 11 套图片技能包（Beta）", "一期 + 二期"],
      ["P3 数字人与音色", "第 6–9 周", "形象库、音色克隆与设计、TTS/ASR、图片口播、视频改口型", "一期"],
      ["P4 石材专属模块", "第 8–10 周", "材质库、大堂效果图、14 类场景模板、厂家介绍视频、行业脚本库", "一期"],
      ["P5 画布与 Agent", "第 8–12 周", "画布编辑器与分组模板、Agent 对话、Agent Cloud 云端沙箱（技术难度最高，安排在三期）", "三期"],
      ["P6 商业化与后台", "第 8–11 周", "充值、订单、发票、用量看板、风控、联盟分销、后台 20 页签", "二期"],
      ["P7 联调压测", "第 11–12 周", "全链路联调、压测、安全加固（RC）", "二 + 三期"],
      ["P8 上线试运行", "第 12 周", "正式上线、备案落地、培训、试运行启动", "全部"],
    ],
    [16, 14, 54, 16]
  ));
  c.push(P("总工期 12 周（约 2~3 个月），自预付款到账且需求资料齐备之日起计算。ICP 备案、支付通道资质审核等甲方侧流程不计入工期，需甲方配合按时提供主体材料。"));
  c.push(H("8.1 人力投入与增配机制", 2));
  c.push(T(
    ["项", "内容"],
    [
      ["投入团队规模", "3~5 人（按里程碑动态投入，非全程满编）；一期 3 人、二期 4 人、三期 5 人"],
      ["人天单价构成", "¥500/人天，已覆盖人力投入成本与乙方的项目管理、系统集成、联调测试、交付验收及质保成本"],
      ["主责人员", "由乙方指定项目负责人全程负责架构设计、模型通道对接、系统集成与交付验收；主责人员不得中途更换，确需更换须提前 5 个工作日书面通知甲方，且替换人员资历不低于原人员"],
      ["并发产能校验", "全量复刻 287 人天 ÷ 60 个工作日 ≈ 4.8 人满负荷，与上述团队规模匹配，工期承诺具备可执行性"],
      ["增配机制", "因甲方需求变更、范围追加或不可预见的第三方接口变更需增派人力的，按 ¥1,000/人天 另计，工期相应顺延"],
      ["顺延规则", "因甲方需求变更、资料未提供或第三方审核延迟导致的延期，工期相应顺延，已完成部分费用不变"],
    ],
    [16, 84]
  ));
  c.push(P("说明：甲方若要求将工期压缩至 8 周，需增配 1 名全栈（按 §8.1 增配机制计费），并同步提供全部业务素材与接口联调窗口。"));

  c.push(H("九、双方权利与义务", 1));
  c.push(bullet("甲方需提供营业执照、支付商户号、ICP 备案主体资料，并配合完成各服务商审核。"));
  c.push(bullet("甲方需提供 20 组以上真实石材样板图、厂房与展厅实拍素材、数字人形象照与录音授权文件，用于效果基准测试与验收。"));
  c.push(bullet("乙方按勾选的功能清单交付可运行、可部署、可验收的软件系统与全套文档。"));
  c.push(bullet("域名、备案主体、服务器、支付商户号、模型供应商账号全部归甲方所有，交付时提供完整移交清单。"));
  c.push(bullet("交付物不包含未授权的第三方代码；采用开源组件的，交付时提供清单与协议说明。"));
  c.push(bullet("甲方素材、字体、图片、音色的版权与肖像/声音授权由甲方负责，乙方提供上传环节的强制勾选与留痕机制。"));
  c.push(H("9.1 验收标准（量化，可判定）", 2));
  c.push(P("验收以第二节勾选的功能清单为唯一基准，各维度判定标准如下，任一维度不达标即视为该期未通过验收："));
  c.push(T(
    ["验收维度", "判定标准"],
    [
      ["功能完整性", "第二节勾选的功能点逐项可用；缺失项按该项人天占比等额扣减开发费"],
      ["生成成功率", "图片类 ≥ 95%、视频类 ≥ 90%（连续 100 次抽样统计，含失败自动重试机制生效）"],
      ["任务时效", "报价与任务提交接口 P95 响应 < 800ms；任务队列积压不超过 50 条"],
      ["稳定性", "连续压测 24 小时无内存泄漏与数据库死锁；服务可用率 ≥ 99.5%（试运行期统计）"],
      ["安全", "无高危漏洞；越权访问、越权扣费、密钥泄露三类用例全部拦截"],
      ["交付物", "源码、部署文档、数据库设计文档、API 接口文档、运维手册、管理员培训（1 场）"],
      ["数据归属", "域名、备案主体、服务器、支付商户号、模型供应商账号及全部业务数据归甲方所有，交付时提供完整移交清单"],
    ],
    [16, 84]
  ));
  c.push(P("★ 效果责任边界：模型出图与出片的品质由第三方模型服务的实际输出决定，乙方承诺工程链路完整、报价准确、任务成功率达标，不承诺特定模型在任意场景下恒定满足商业投放标准。若甲方对某能力的效果不满意，双方按第九节变更流程评估人工精修方案或调整模型通道，不以效果主观评价直接认定功能未交付。"));

  c.push(H("十、报价说明与除外事项", 1));
  c.push(bullet("本次报价范围仅包含 https://susu.da-ai.cc/ 站点的前后端功能复刻及其上新增的石材行业模块；短信/彩信群发系统、SIM 卡池、串口与 AT 指令等硬件侧系统不属于本项目范围。"));
  c.push(bullet("本项目为全新系统建设，不包含任何历史数据迁移工作；原站的私有部署环境、账号体系与存量业务数据均不在交付范围内。"));
  c.push(bullet("模型效果不由乙方承诺：乙方承诺工程链路完整、报价准确、任务成功率达标，不承诺特定模型出图/出片品质在任意场景下恒定满足商业投放标准。"));
  c.push(bullet("模型供应商账号、域名、备案主体、服务器、支付商户号全部归甲方所有，交付时提供完整移交清单。"));
  c.push(bullet("需求变更须提交变更申请单，评估对工期、成本、既有功能的影响，经双方项目经理签字生效；累计变更超 10 人天自动进入变更流程并另行计费，变更单价为 ¥1,000/人天。"));
  c.push(bullet("延期责任：因甲方需求变更、资料未提供或第三方审核延迟导致的延期，工期相应顺延，费用不变。"));
  c.push(bullet("开发过程中每 2 周一次进度同步会，会议不计入工时；甲方超过 5 个工作日未反馈视同确认。"));

  c.push(H("十一、报价有效期与签署", 1));
  c.push(P("本报价自 2026-10-29 起 30 个自然日内有效。超出有效期后，乙方将根据届时的人力与云资源成本重新核定。双方勾选确认的功能清单与费用，构成本项目的开发范围与结算依据，与合同正文具有同等效力。"));
  c.push(P(""));
  c.push(T(
    ["", "甲方（委托方）", "乙方（开发方）"],
    [
      ["单位名称", "", ""],
      ["授权代表", "", ""],
      ["签字 / 盖章", "", ""],
      ["日期", "", ""],
      ["确认勾选功能清单金额", "", ""],
    ],
    [24, 38, 38]
  ));

  return baseDoc(c, "软件开发项目报价单 · DAAI 同款平台全量复刻", "全量复刻版 V4.0 · 12 周交付");
}

(async () => {
  const outDir = "D:/code/xin-ai/deliverables";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const d1 = buildDevDoc();
  // 自营版不生成对外报价单（对外版本在 f:\wct\deliverables）

  // 目标文件可能被 Word 占用，先写临时文件再覆盖
  async function writeSafe(name, buf) {
    const finalPath = outDir + "/" + name;
    const tmpPath = outDir + "/~" + name + ".tmp";
    fs.writeFileSync(tmpPath, buf);
    for (let i = 0; i < 12; i++) {
      try {
        fs.renameSync(tmpPath, finalPath);
        return;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    // 仍被占用：写到带时间戳的副本
    const alt = outDir + "/" + name.replace(/\.docx$/, "-新" + Date.now() + ".docx");
    fs.renameSync(tmpPath, alt);
    console.log("目标文件被占用，已另存为：" + alt);
  }

  await writeSafe("xin-ai-开发规格说明书-V1.docx", await Packer.toBuffer(d1));
  console.log("done");
})();

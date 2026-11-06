/**
 * 原站技能导航清单（new-ai 实测抓取，2026-10-30）
 * 分类与条目名称、描述、skill_pack / skill 参数全部与原站一致。
 * 缩略图使用我们自行生成的默认图（用户要求：默认图自行生成）。
 */

export interface NavSkill {
  label: string;
  description?: string;
  href: string;
  imageUrl?: string;
}

export interface NavSection {
  title: string;
  items: NavSkill[];
}

/** 自生成默认图路径（按 skill id） */
export const skillImage = (id: string) => `/images/gen/skill-${id}.jpg`;

export const IMAGE_NAV: NavSection[] = [
  {
    title: "人物",
    items: [
      {
        label: "脸部三视图",
        description: "生成正脸、侧脸、半侧脸参考",
        href: "/toolbox/image-generation?skill_pack=character-face-turnaround",
        imageUrl: skillImage("character-face-turnaround"),
      },
      {
        label: "人物四视图",
        description: "生成全身三视角与脸部特写",
        href: "/toolbox/image-generation?skill_pack=character-fullbody-sheet",
        imageUrl: skillImage("character-fullbody-sheet"),
      },
      {
        label: "模特换脸",
        description: "一键替换面部与发型",
        href: "/toolbox/image-generation?skill_pack=change-face",
        imageUrl: skillImage("change-face"),
      },
      {
        label: "人脸融合",
        description: "融合两张人脸生成全新虚拟头像资产",
        href: "/toolbox/image-generation?skill_pack=dual-face-fusion",
        imageUrl: skillImage("dual-face-fusion"),
      },
    ],
  },
  {
    title: "商品",
    items: [
      {
        label: "服装上身",
        description: "替换模特身上的服装衣物",
        href: "/toolbox/image-generation?skill_pack=change-cloth",
        imageUrl: skillImage("change-cloth"),
      },
      {
        label: "商品使用",
        description: "生成真人试用与使用场景",
        href: "/toolbox/image-generation?skill_pack=model-product-try-on",
        imageUrl: skillImage("model-product-try-on"),
      },
      {
        label: "商品白底图",
        description: "生成高级白底商品图与多角度资产",
        href: "/toolbox/image-generation?skill_pack=product-white-background",
        imageUrl: skillImage("product-white-background"),
      },
      {
        label: "服装改款",
        description: "替换服装的面料、印花等",
        href: "/toolbox/image-generation?skill_pack=element-replace",
        imageUrl: skillImage("element-replace"),
      },
    ],
  },
  {
    title: "场景",
    items: [
      {
        label: "人物入景",
        description: "替换模特图背景",
        href: "/toolbox/image-generation?skill_pack=background-change",
        imageUrl: skillImage("background-change"),
      },
    ],
  },
  {
    title: "增强",
    items: [
      {
        label: "人物真人感",
        description: "AI虚拟人添加真实感",
        href: "/toolbox/image-generation?skill_pack=portrait-realism-enhance",
        imageUrl: skillImage("portrait-realism-enhance"),
      },
      {
        label: "图片精修",
        description: "修复画质、光影和清晰度",
        href: "/toolbox/image-generation?skill_pack=product-refine",
        imageUrl: skillImage("product-refine"),
      },
    ],
  },
];

export const VIDEO_NAV: NavSection[] = [
  {
    title: "电商带货",
    items: [
      {
        label: "口播带货",
        description: "真人推荐，建立购买信任",
        href: "/toolbox/video-generation?skill=ecommerce-spoken-selling",
        imageUrl: skillImage("ecommerce-spoken-selling"),
      },
      {
        label: "促销转化",
        description: "放大优惠，推动立即下单",
        href: "/toolbox/video-generation?skill=ecommerce-promotion-conversion",
        imageUrl: skillImage("ecommerce-promotion-conversion"),
      },
      {
        label: "场景种草",
        description: "植入场景，激发使用需求",
        href: "/toolbox/video-generation?skill=ecommerce-scene-seeding",
        imageUrl: skillImage("ecommerce-scene-seeding"),
      },
      {
        label: "痛点解决",
        description: "直击痛点，展示解决效果",
        href: "/toolbox/video-generation?skill=ecommerce-pain-point-solution",
        imageUrl: skillImage("ecommerce-pain-point-solution"),
      },
      {
        label: "功能演示",
        description: "演示功能，证明产品价值",
        href: "/toolbox/video-generation?skill=ecommerce-function-demo",
        imageUrl: skillImage("ecommerce-function-demo"),
      },
    ],
  },
  {
    title: "同城到店",
    items: [
      {
        label: "门店发现",
        description: "突出特色，制造到店理由",
        href: "/toolbox/video-generation?skill=local-store-discovery",
        imageUrl: skillImage("local-store-discovery"),
      },
      {
        label: "到店实录",
        description: "真实体验，建立消费信任",
        href: "/toolbox/video-generation?skill=local-store-visit-record",
        imageUrl: skillImage("local-store-visit-record"),
      },
      {
        label: "招牌体验",
        description: "聚焦招牌，证明门店价值",
        href: "/toolbox/video-generation?skill=local-store-signature-experience",
        imageUrl: skillImage("local-store-signature-experience"),
      },
      {
        label: "同城团购",
        description: "突出优惠，推动到店核销",
        href: "/toolbox/video-generation?skill=local-store-group-buy-conversion",
        imageUrl: skillImage("local-store-group-buy-conversion"),
      },
    ],
  },
  {
    title: "品牌广告",
    items: [
      {
        label: "品牌主张",
        description: "传递理念，建立价值认同",
        href: "/toolbox/video-generation?skill=advertising-brand-proposition",
        imageUrl: skillImage("advertising-brand-proposition"),
      },
      {
        label: "品牌故事",
        description: "讲述故事，强化品牌信任",
        href: "/toolbox/video-generation?skill=advertising-brand-story",
        imageUrl: skillImage("advertising-brand-story"),
      },
      {
        label: "生活方式",
        description: "塑造场景，建立品牌向往",
        href: "/toolbox/video-generation?skill=advertising-lifestyle",
        imageUrl: skillImage("advertising-lifestyle"),
      },
      {
        label: "创意概念",
        description: "创意表达，强化品牌记忆",
        href: "/toolbox/video-generation?skill=advertising-creative-concept",
        imageUrl: skillImage("advertising-creative-concept"),
      },
    ],
  },
  {
    title: "剧情短片",
    items: [
      {
        label: "对话短剧",
        description: "人物冲突，推动剧情发展",
        href: "/toolbox/video-generation?skill=short-drama-dialogue",
        imageUrl: skillImage("short-drama-dialogue"),
      },
      {
        label: "反转短剧",
        description: "剧情反转，制造传播记忆",
        href: "/toolbox/video-generation?skill=short-drama-reversal",
        imageUrl: skillImage("short-drama-reversal"),
      },
      {
        label: "悬念短剧",
        description: "设置悬念，持续吸引观看",
        href: "/toolbox/video-generation?skill=short-drama-suspense",
        imageUrl: skillImage("short-drama-suspense"),
      },
      {
        label: "情绪短片",
        description: "情绪共鸣，强化内容感染",
        href: "/toolbox/video-generation?skill=short-drama-emotional",
        imageUrl: skillImage("short-drama-emotional"),
      },
      {
        label: "产品植入",
        description: "融入剧情，自然传递价值",
        href: "/toolbox/video-generation?skill=short-drama-product-placement",
        imageUrl: skillImage("short-drama-product-placement"),
      },
    ],
  },
];

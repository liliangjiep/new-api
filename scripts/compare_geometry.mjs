// 对比脚本：读取原站/本地两页的关键几何，打印差异
// 用法：node scripts/compare_geometry.mjs
const PAGES = [
  "/toolbox/ecommerce-image-set",
  "/toolbox/image-generation",
  "/toolbox/video-generation",
  "/toolbox/depth-video-clone",
  "/toolbox/digital-human",
  "/toolbox/video-quality-enhance",
  "/toolbox/video-subtitle-erase",
  "/toolbox/video-watermark-remove",
];

export const SELECTORS = [
  [".genify-toolbox-3col", "grid"],
  [".toolbox-edit-region", "edit"],
  [".toolbox-preview-region", "preview"],
  [".toolbox-queue-region", "queue"],
  [".toolbox-editor-panel-root", "panel"],
  [".toolbox-preview-panel", "previewPanel"],
  [".toolbox-preview-tab", "tab"],
];

export function collect(doc) {
  const out = {};
  for (const [sel, key] of SELECTORS) {
    const els = Array.from(doc.querySelectorAll(sel));
    out[key] = els.map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    });
  }
  out.buttons = Array.from(doc.querySelectorAll("button, a[href]"))
    .map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);
  return out;
}

export const pageList = PAGES;

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "apps", "web", "public", "placeholders");
fs.mkdirSync(dir, { recursive: true });

/** 素材缩略图占位：不同色相的抽象几何，避免 AI 生成的具象图片 */
const assetVariants = [
  { bg: "#12161a", fg: "#2ee6c5", accent: "#1a2a2e", glyph: "rect" },
  { bg: "#14161c", fg: "#4a9eff", accent: "#1c2430", glyph: "circle" },
  { bg: "#16141a", fg: "#c77dff", accent: "#241c2a", glyph: "tri" },
  { bg: "#191614", fg: "#ff9f5a", accent: "#2a1f18", glyph: "rect" },
  { bg: "#141916", fg: "#7ee787", accent: "#1c261e", glyph: "circle" },
  { bg: "#181418", fg: "#ff6b81", accent: "#2a1c20", glyph: "tri" },
];

function glyph(kind, color) {
  if (kind === "circle")
    return `<circle cx="200" cy="150" r="58" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.55"/><circle cx="200" cy="150" r="26" fill="${color}" opacity="0.18"/>`;
  if (kind === "tri")
    return `<path d="M200 92 L258 208 L142 208 Z" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.55"/>`;
  return `<rect x="142" y="92" width="116" height="116" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.55"/><rect x="166" y="116" width="68" height="68" fill="${color}" opacity="0.14"/>`;
}

function svg(v, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${v.accent}"/>
      <stop offset="1" stop-color="${v.bg}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <g stroke="${v.fg}" stroke-width="0.6" opacity="0.13">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${i * 34}" x2="400" y2="${i * 34}"/>`).join("")}
    ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 34}" y1="0" x2="${i * 34}" y2="300"/>`).join("")}
  </g>
  ${glyph(v.glyph, v.fg)}
  <text x="200" y="262" text-anchor="middle" fill="${v.fg}" opacity="0.5"
    font-family="monospace" font-size="11" letter-spacing="1.5">${label}</text>
</svg>`;
}

assetVariants.forEach((v, i) => {
  fs.writeFileSync(
    path.join(dir, `asset-${i + 1}.svg`),
    svg(v, "ASSET PLACEHOLDER")
  );
});

assetVariants.forEach((v, i) => {
  fs.writeFileSync(
    path.join(dir, `result-${i + 1}.svg`),
    svg(v, "GENERATED RESULT")
  );
});

/** 通用画布网格 */
fs.writeFileSync(
  path.join(dir, "canvas-grid.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#0f1215"/><g stroke="#1e252b" stroke-width="1"><path d="M0 40h400M0 80h400M0 120h400M0 160h400M0 200h400M0 240h400M0 280h400M0 320h400M0 360h400"/><path d="M40 0v400M80 0v400M120 0v400M160 0v400M200 0v400M240 0v400M280 0v400M320 0v400M360 0v400"/></g></svg>`
);

console.log("placeholders written:", fs.readdirSync(dir).length);

import type { NextConfig } from "next";

/**
 * 前端联调配置。
 * 行内注释1：/api/v1 走 Next 反向代理到本地后端（默认 3001）——
 *             这样浏览器侧同源，无需后端开 CORS；换后端只改 BACKEND_ORIGIN。
 * 行内注释2：NEXT_PUBLIC_API_BASE 可覆盖为直连地址（如部署时前后端同域反代）。
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

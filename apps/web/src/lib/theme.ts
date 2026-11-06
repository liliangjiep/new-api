export const THEMES = [
  { id: "new-ai", label: "默认", swatch: "hsl(0 0% 98%)" },
  { id: "midnight", label: "午夜", swatch: "hsl(220 16% 7%)" },
  { id: "dawn", label: "晨曦", swatch: "hsl(40 24% 97%)" },
  { id: "graphite", label: "石墨", swatch: "hsl(210 8% 12%)" },
  { id: "verdigris", label: "铜绿", swatch: "hsl(178 22% 18%)" },
  { id: "sand", label: "砂岩", swatch: "hsl(36 26% 91%)" },
  { id: "crimson", label: "绯红", swatch: "hsl(350 14% 8%)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "new-ai";

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

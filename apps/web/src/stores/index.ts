import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME, type ThemeId } from "@/lib/theme";

interface ThemeState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    { name: "xin.theme" }
  )
);

interface AuthState {
  user: { id: string; nickname: string; role: string } | null;
  setUser: (u: AuthState["user"]) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    { name: "xin.auth" }
  )
);

/**
 * 全局登录弹窗开关（2026-11-01）
 * 原站侧栏右下角的「登录」按钮点击后弹出 .modal-login-shell 登录/注册弹窗。
 * 这里用全局 store，让任意路由的侧栏按钮都能打开同一个弹窗。
 */
interface LoginModalState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

export const useLoginModalStore = create<LoginModalState>()((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

// M1-06 画布状态：选中节点 / 缩放 / 脏标记
// 行内注释1：只存 UI 瞬态，不持久化，避免版本冲突污染 localStorage
interface CanvasState {
  selectedId: string | null;
  zoom: number;
  dirty: boolean;
  select: (id: string | null) => void;
  setZoom: (z: number) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  selectedId: null,
  zoom: 1,
  dirty: false,
  select: (selectedId) => set({ selectedId }),
  setZoom: (zoom) => set({ zoom }),
  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),
}));

// M1-06 播放器状态：当前任务 / 播放进度 / 播放开关
// TODO(API): 接入 SSE 后 progress 由事件流驱动，此处仅做本地 mock 推进
interface PlayerState {
  taskId: string | null;
  playing: boolean;
  progress: number;
  open: (taskId: string) => void;
  close: () => void;
  toggle: () => void;
  setProgress: (p: number) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  taskId: null,
  playing: false,
  progress: 0,
  open: (taskId) => set({ taskId, playing: true, progress: 0 }),
  close: () => set({ taskId: null, playing: false, progress: 0 }),
  toggle: () => set((s) => ({ playing: !s.playing })),
  setProgress: (progress) => set({ progress }),
}));

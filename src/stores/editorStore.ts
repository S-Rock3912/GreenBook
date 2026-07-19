import { create } from 'zustand';
import type { Tool } from '../types';

/** グリーン図でよく使う色。緑の画像上で視認性が高いものを選定 */
export const PALETTE = [
  '#e02020', // 赤（下り・注意）
  '#1560e0', // 青（上り）
  '#ffffff', // 白
  '#111111', // 黒
  '#f5a800', // オレンジ（ピン位置など）
  '#7b2fd0', // 紫
] as const;

export const STROKE_WIDTHS = [3, 5, 9] as const;

interface EditorState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tool: 'pen',
  color: PALETTE[0],
  strokeWidth: STROKE_WIDTHS[1],
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
}));

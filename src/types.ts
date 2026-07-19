/** 描画ツールの種類 */
export type Tool =
  | 'pen'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'eraser';

/**
 * 図形の座標はすべて 0〜1 の正規化座標。
 * キャンバスサイズが変わっても（機種・回転）描画位置が保たれる。
 */
interface BaseShape {
  id: string;
  color: string;
  /** 基準幅 600px 時の線幅(px)。描画時にキャンバス幅で拡縮する */
  width: number;
}

export interface PenShape extends BaseShape {
  type: 'pen';
  /** [x0, y0, x1, y1, ...] のフラット配列 */
  points: number[];
}

export interface LineShape extends BaseShape {
  type: 'line' | 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

export type Shape = PenShape | LineShape | RectShape | EllipseShape | TextShape;

export type MemoCategory = 'putt' | 'slope' | 'speed' | 'other';

export const MEMO_CATEGORY_LABELS: Record<MemoCategory, string> = {
  putt: 'パット',
  slope: '傾斜',
  speed: '速さ',
  other: 'その他',
};

export interface Memo {
  id: string;
  category: MemoCategory;
  text: string;
  createdAt: string; // ISO8601
  updatedAt: string;
}

export interface Hole {
  number: number;
  par?: number;
  /** グリーン図画像（縮小済み dataURL）。デバイス内に保存される */
  imageUrl?: string;
  shapes: Shape[];
  memos: Memo[];
}

export interface Course {
  id: string; // uuid（Supabase 同期でそのまま主キーに使う）
  name: string;
  holes: Hole[];
  createdAt: string;
  updatedAt: string;
}

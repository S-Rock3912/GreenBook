import { useCallback, useEffect, useRef, useState } from 'react';
import type { Shape, Tool } from '../types';
import { uuid } from '../lib/uuid';

/** 線幅・文字サイズの基準となるキャンバス幅(px) */
const BASE_WIDTH = 600;
/** 消しゴムの当たり判定半径(css px) */
const ERASE_TOLERANCE = 16;
/** 画像なしのときのデフォルトアスペクト比 (h / w) */
const DEFAULT_ASPECT = 1.0;

interface Props {
  imageUrl?: string;
  shapes: Shape[];
  tool: Tool;
  color: string;
  strokeWidth: number;
  /** 図形リストが確定変更されたとき（描画完了・消去完了）に呼ばれる */
  onCommit: (shapes: Shape[]) => void;
}

function fontSizeFor(shape: { width: number }, scale: number): number {
  return Math.max(12, (10 + shape.width * 3) * scale);
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  w: number,
  h: number,
): void {
  const s = w / BASE_WIDTH;
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = Math.max(1, shape.width * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.type) {
    case 'pen': {
      const pts = shape.points;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0] * w, pts[1] * h);
      if (pts.length === 2) {
        // 1点だけのタップは点として描く
        ctx.lineTo(pts[0] * w + 0.1, pts[1] * h);
      }
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i] * w, pts[i + 1] * h);
      }
      ctx.stroke();
      break;
    }
    case 'line':
    case 'arrow': {
      const x1 = shape.x1 * w;
      const y1 = shape.y1 * h;
      const x2 = shape.x2 * w;
      const y2 = shape.y2 * h;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (shape.type === 'arrow') {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = Math.max(12 * s, ctx.lineWidth * 3);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - head * Math.cos(angle - Math.PI / 6),
          y2 - head * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - head * Math.cos(angle + Math.PI / 6),
          y2 - head * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
      }
      break;
    }
    case 'rect':
      ctx.strokeRect(shape.x * w, shape.y * h, shape.w * w, shape.h * h);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(
        shape.cx * w,
        shape.cy * h,
        Math.abs(shape.rx * w),
        Math.abs(shape.ry * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    case 'text': {
      const size = fontSizeFor(shape, s);
      ctx.font = `bold ${size}px -apple-system, "Hiragino Sans", sans-serif`;
      ctx.textBaseline = 'alphabetic';
      // 写真上でも読めるよう縁取りを付ける
      ctx.strokeStyle = shape.color === '#ffffff' ? '#111111' : '#ffffff';
      ctx.lineWidth = Math.max(2, size / 8);
      ctx.strokeText(shape.text, shape.x * w, shape.y * h);
      ctx.fillText(shape.text, shape.x * w, shape.y * h);
      break;
    }
  }
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** css px 座標 (px, py) が図形に触れているか */
function hitTest(
  shape: Shape,
  px: number,
  py: number,
  w: number,
  h: number,
  tol: number,
): boolean {
  switch (shape.type) {
    case 'pen': {
      const pts = shape.points;
      if (pts.length === 2) {
        return Math.hypot(px - pts[0] * w, py - pts[1] * h) <= tol;
      }
      for (let i = 0; i + 3 < pts.length; i += 2) {
        if (
          distToSegment(
            px,
            py,
            pts[i] * w,
            pts[i + 1] * h,
            pts[i + 2] * w,
            pts[i + 3] * h,
          ) <= tol
        ) {
          return true;
        }
      }
      return false;
    }
    case 'line':
    case 'arrow':
      return (
        distToSegment(px, py, shape.x1 * w, shape.y1 * h, shape.x2 * w, shape.y2 * h) <=
        tol
      );
    case 'rect': {
      const x = shape.x * w;
      const y = shape.y * h;
      const rw = shape.w * w;
      const rh = shape.h * h;
      return (
        distToSegment(px, py, x, y, x + rw, y) <= tol ||
        distToSegment(px, py, x + rw, y, x + rw, y + rh) <= tol ||
        distToSegment(px, py, x + rw, y + rh, x, y + rh) <= tol ||
        distToSegment(px, py, x, y + rh, x, y) <= tol
      );
    }
    case 'ellipse': {
      const rx = Math.abs(shape.rx * w);
      const ry = Math.abs(shape.ry * h);
      if (rx < 1 || ry < 1) return false;
      const nx = (px - shape.cx * w) / rx;
      const ny = (py - shape.cy * h) / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      return Math.abs(d - 1) * Math.min(rx, ry) <= tol;
    }
    case 'text': {
      const size = fontSizeFor(shape, w / BASE_WIDTH);
      const tw = shape.text.length * size; // CJK想定で1文字≒1em（多少広めでOK）
      const x = shape.x * w;
      const y = shape.y * h;
      return (
        px >= x - tol &&
        px <= x + tw + tol &&
        py >= y - size - tol &&
        py <= y + size * 0.3 + tol
      );
    }
  }
}

export default function GreenCanvas({
  imageUrl,
  shapes,
  tool,
  color,
  strokeWidth,
  onCommit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const shapesRef = useRef<Shape[]>(shapes);
  const draftRef = useRef<Shape | null>(null);
  /** 消しゴムドラッグ中の作業コピー（null = 消去中でない） */
  const erasingRef = useRef<Shape[] | null>(null);
  const drawingRef = useRef(false);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  shapesRef.current = shapes;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = size;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const img = imageRef.current;
    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      // 画像なしでも「白紙のグリーン」として描き込めるようにする
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#cde6bc');
      grad.addColorStop(1, '#a8cf90');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      const step = w / 8;
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    const list = erasingRef.current ?? shapesRef.current;
    for (const shape of list) drawShape(ctx, shape, w, h);
    if (draftRef.current) drawShape(ctx, draftRef.current, w, h);
  }, [size]);

  // 画像の読み込み
  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      setAspect(DEFAULT_ASPECT);
      redraw();
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setAspect(img.height / img.width);
      redraw();
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
    // redraw は size 変更時にも別 effect で呼ばれる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // コンテナ幅に追従してキャンバスサイズを決める
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setSize({ w, h: Math.round(w * aspect) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // shapes / size が変わったら再描画
  useEffect(() => {
    redraw();
  }, [shapes, size, redraw]);

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    const { x, y } = getPos(e);
    const { w, h } = size;
    if (w === 0 || h === 0) return;
    const nx = x / w;
    const ny = y / h;
    const base = { id: uuid(), color, width: strokeWidth };

    if (tool === 'text') {
      const text = window.prompt('テキストを入力');
      if (text && text.trim()) {
        onCommit([...shapesRef.current, { ...base, type: 'text', x: nx, y: ny, text: text.trim() }]);
      }
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 一部環境で無効な pointerId に対して例外が出るが、描画自体は続行できる
    }
    drawingRef.current = true;

    if (tool === 'eraser') {
      erasingRef.current = shapesRef.current.filter(
        (s) => !hitTest(s, x, y, w, h, ERASE_TOLERANCE),
      );
      redraw();
      return;
    }

    switch (tool) {
      case 'pen':
        draftRef.current = { ...base, type: 'pen', points: [nx, ny] };
        break;
      case 'line':
      case 'arrow':
        draftRef.current = { ...base, type: tool, x1: nx, y1: ny, x2: nx, y2: ny };
        break;
      case 'rect':
        draftRef.current = { ...base, type: 'rect', x: nx, y: ny, w: 0, h: 0 };
        break;
      case 'ellipse':
        draftRef.current = { ...base, type: 'ellipse', cx: nx, cy: ny, rx: 0, ry: 0 };
        break;
    }
    // rect/ellipse は始点を控えておく
    startRef.current = { x: nx, y: ny };
    redraw();
  };

  const startRef = useRef({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const { x, y } = getPos(e);
    const { w, h } = size;
    const nx = x / w;
    const ny = y / h;

    if (tool === 'eraser') {
      if (erasingRef.current) {
        const next = erasingRef.current.filter(
          (s) => !hitTest(s, x, y, w, h, ERASE_TOLERANCE),
        );
        if (next.length !== erasingRef.current.length) {
          erasingRef.current = next;
          redraw();
        }
      }
      return;
    }

    const draft = draftRef.current;
    if (!draft) return;
    switch (draft.type) {
      case 'pen':
        draft.points.push(nx, ny);
        break;
      case 'line':
      case 'arrow':
        draft.x2 = nx;
        draft.y2 = ny;
        break;
      case 'rect': {
        const sx = startRef.current.x;
        const sy = startRef.current.y;
        draft.x = Math.min(sx, nx);
        draft.y = Math.min(sy, ny);
        draft.w = Math.abs(nx - sx);
        draft.h = Math.abs(ny - sy);
        break;
      }
      case 'ellipse': {
        const sx = startRef.current.x;
        const sy = startRef.current.y;
        draft.cx = (sx + nx) / 2;
        draft.cy = (sy + ny) / 2;
        draft.rx = Math.abs(nx - sx) / 2;
        draft.ry = Math.abs(ny - sy) / 2;
        break;
      }
    }
    redraw();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === 'eraser') {
      const erased = erasingRef.current;
      erasingRef.current = null;
      if (erased && erased.length !== shapesRef.current.length) {
        onCommit(erased);
      } else {
        redraw();
      }
      return;
    }

    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;

    const { w, h } = size;
    const minDrag = 4; // css px 未満のドラッグはゴミとして捨てる（ペンのタップ点は除く）
    let valid = true;
    switch (draft.type) {
      case 'line':
      case 'arrow':
        valid =
          Math.hypot((draft.x2 - draft.x1) * w, (draft.y2 - draft.y1) * h) >= minDrag;
        break;
      case 'rect':
        valid = draft.w * w >= minDrag || draft.h * h >= minDrag;
        break;
      case 'ellipse':
        valid = draft.rx * w >= minDrag / 2 || draft.ry * h >= minDrag / 2;
        break;
    }
    if (valid) {
      onCommit([...shapesRef.current, draft]);
    } else {
      redraw();
    }
  };

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        className="green-canvas"
        style={{ width: size.w, height: size.h, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

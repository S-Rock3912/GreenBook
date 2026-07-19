import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GreenCanvas from '../components/GreenCanvas';
import Toolbar from '../components/Toolbar';
import MemoPanel from '../components/MemoPanel';
import { useCourseStore } from '../stores/courseStore';
import { useEditorStore } from '../stores/editorStore';
import { fileToResizedDataUrl } from '../lib/image';
import type { Shape } from '../types';

type Tab = 'green' | 'memo';

export default function HolePage() {
  const { courseId, holeNo } = useParams<{ courseId: string; holeNo: string }>();
  const navigate = useNavigate();
  const holeNumber = Number(holeNo);

  const course = useCourseStore((s) => s.courses.find((c) => c.id === courseId));
  const { setHoleImage, setHoleShapes } = useCourseStore();
  const { tool, color, strokeWidth } = useEditorStore();

  const [tab, setTab] = useState<Tab>('green');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo（このホールの編集セッション内のみ有効）
  // スタック更新は必ず setHoleShapes とセットで行われ、ストア更新が
  // 再レンダーを起こすため、ref だけで disabled 表示も正しく追従する。
  const undoStack = useRef<Shape[][]>([]);
  const redoStack = useRef<Shape[][]>([]);

  useEffect(() => {
    undoStack.current = [];
    redoStack.current = [];
  }, [courseId, holeNumber]);

  const hole = course?.holes.find((h) => h.number === holeNumber);

  if (!course || !hole) {
    return (
      <div className="page">
        <header className="app-header">
          <Link to="/" className="back-btn">
            ‹ 戻る
          </Link>
        </header>
        <main className="page-body">
          <p className="empty-state">ホールが見つかりません</p>
        </main>
      </div>
    );
  }

  const commitShapes = (shapes: Shape[]) => {
    undoStack.current.push(hole.shapes);
    redoStack.current = [];
    setHoleShapes(course.id, hole.number, shapes);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) {
      redoStack.current.push(hole.shapes);
      setHoleShapes(course.id, hole.number, prev);
    }
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (next) {
      undoStack.current.push(hole.shapes);
      setHoleShapes(course.id, hole.number, next);
    }
  };

  const clearAll = () => {
    if (hole.shapes.length === 0) return;
    if (window.confirm('描き込みをすべて消去しますか？')) {
      commitShapes([]);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setHoleImage(course.id, hole.number, dataUrl);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '画像の読み込みに失敗しました');
    }
  };

  const removeImage = () => {
    if (window.confirm('グリーン図の画像を削除しますか？（描き込みは残ります）')) {
      setHoleImage(course.id, hole.number, undefined);
    }
  };

  const goHole = (delta: number) => {
    const next = hole.number + delta;
    if (next >= 1 && next <= course.holes.length) {
      navigate(`/course/${course.id}/hole/${next}`);
    }
  };

  return (
    <div className="page hole-page">
      <header className="app-header row">
        <Link to={`/course/${course.id}`} className="back-btn">
          ‹
        </Link>
        <div className="hole-nav">
          <button
            className="hole-nav-btn"
            onClick={() => goHole(-1)}
            disabled={hole.number <= 1}
          >
            ◀
          </button>
          <h1 className="header-title">
            {course.name} <strong>{hole.number}H</strong>
          </h1>
          <button
            className="hole-nav-btn"
            onClick={() => goHole(1)}
            disabled={hole.number >= course.holes.length}
          >
            ▶
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === 'green' ? 'active' : ''}`}
          onClick={() => setTab('green')}
        >
          グリーン図
        </button>
        <button
          className={`tab ${tab === 'memo' ? 'active' : ''}`}
          onClick={() => setTab('memo')}
        >
          メモ {hole.memos.length > 0 && `(${hole.memos.length})`}
        </button>
      </nav>

      {tab === 'green' ? (
        <main className="page-body editor-body">
          <div className="canvas-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
            <button className="btn small" onClick={() => fileInputRef.current?.click()}>
              📷 {hole.imageUrl ? '画像を変更' : '画像を追加'}
            </button>
            {hole.imageUrl && (
              <button className="btn small" onClick={removeImage}>
                画像を削除
              </button>
            )}
            <span className="spacer" />
            <button
              className="btn small"
              onClick={undo}
              disabled={undoStack.current.length === 0}
              aria-label="元に戻す"
            >
              ↩︎
            </button>
            <button
              className="btn small"
              onClick={redo}
              disabled={redoStack.current.length === 0}
              aria-label="やり直す"
            >
              ↪︎
            </button>
            <button
              className="btn small"
              onClick={clearAll}
              disabled={hole.shapes.length === 0}
            >
              全消去
            </button>
          </div>

          <GreenCanvas
            imageUrl={hole.imageUrl}
            shapes={hole.shapes}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onCommit={commitShapes}
          />

          <Toolbar />
        </main>
      ) : (
        <main className="page-body">
          <MemoPanel courseId={course.id} hole={hole} />
        </main>
      )}
    </div>
  );
}

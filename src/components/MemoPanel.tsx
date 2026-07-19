import { useState } from 'react';
import { useCourseStore } from '../stores/courseStore';
import { MEMO_CATEGORY_LABELS, type Hole, type MemoCategory } from '../types';

const QUICK_TEMPLATES = [
  '奥から速い',
  '受けグリーン',
  '左に切れる',
  '右に切れる',
  '2段グリーン',
  '芝目：順目',
];

interface Props {
  courseId: string;
  hole: Hole;
}

export default function MemoPanel({ courseId, hole }: Props) {
  const { addMemo, updateMemo, deleteMemo } = useCourseStore();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MemoCategory>('putt');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addMemo(courseId, hole.number, category, text);
    setText('');
  };

  const saveEdit = (memoId: string) => {
    if (editingText.trim()) {
      updateMemo(courseId, hole.number, memoId, editingText);
    }
    setEditingId(null);
  };

  return (
    <div className="memo-panel">
      <div className="memo-form">
        <div className="category-chips">
          {(Object.keys(MEMO_CATEGORY_LABELS) as MemoCategory[]).map((c) => (
            <button
              key={c}
              className={`chip category-${c} ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {MEMO_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="quick-templates">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t}
              className="chip template"
              onClick={() => setText((prev) => (prev ? `${prev} ${t}` : t))}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="memo-input-row">
          <textarea
            className="memo-input"
            placeholder="例：ピン奥のときは手前から。午後は乾いて速くなる"
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn primary" onClick={submit} disabled={!text.trim()}>
            追加
          </button>
        </div>
      </div>

      <ul className="memo-list">
        {hole.memos.length === 0 && (
          <li className="memo-empty">まだメモがありません</li>
        )}
        {hole.memos.map((memo) => (
          <li key={memo.id} className="memo-item">
            <span className={`memo-badge category-${memo.category}`}>
              {MEMO_CATEGORY_LABELS[memo.category]}
            </span>
            {editingId === memo.id ? (
              <div className="memo-edit">
                <textarea
                  className="memo-input"
                  value={editingText}
                  rows={2}
                  autoFocus
                  onChange={(e) => setEditingText(e.target.value)}
                />
                <div className="memo-edit-actions">
                  <button className="btn small" onClick={() => setEditingId(null)}>
                    キャンセル
                  </button>
                  <button className="btn small primary" onClick={() => saveEdit(memo.id)}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="memo-text">{memo.text}</p>
                <div className="memo-meta">
                  <time>
                    {new Date(memo.updatedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  <button
                    className="link-btn"
                    onClick={() => {
                      setEditingId(memo.id);
                      setEditingText(memo.text);
                    }}
                  >
                    編集
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => {
                      if (window.confirm('このメモを削除しますか？')) {
                        deleteMemo(courseId, hole.number, memo.id);
                      }
                    }}
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

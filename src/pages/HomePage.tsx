import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../stores/courseStore';
import { deleteRemoteCourse } from '../lib/sync';
import SyncPanel from '../components/SyncPanel';
import StorageBadge from '../components/StorageBadge';

export default function HomePage() {
  const navigate = useNavigate();
  const { courses, addCourse, renameCourse, deleteCourse } = useCourseStore();
  const [name, setName] = useState('');
  const [holeCount, setHoleCount] = useState(18);
  const [showForm, setShowForm] = useState(false);

  const create = () => {
    if (!name.trim()) return;
    try {
      const id = addCourse(name, holeCount);
      setName('');
      setShowForm(false);
      navigate(`/course/${id}`);
    } catch (err) {
      // 無反応で終わらせず、原因をユーザーに見せる
      window.alert(
        `コースを作成できませんでした:\n${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <div className="page">
      <header className="app-header">
        <h1>⛳ GreenBook</h1>
        <p className="subtitle">デジタルグリーンブック</p>
      </header>

      <main className="page-body">
        {courses.length === 0 && !showForm && (
          <div className="empty-state">
            <p>コースを登録して、あなただけの</p>
            <p>グリーンブックを作りましょう</p>
          </div>
        )}

        <ul className="course-list">
          {courses.map((course) => {
            const holeCountWithData = course.holes.filter(
              (h) => h.imageUrl || h.shapes.length > 0 || h.memos.length > 0,
            ).length;
            return (
              <li key={course.id}>
                <button
                  className="course-card"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="course-card-main">
                    <span className="course-name">{course.name}</span>
                    <span className="course-info">
                      {course.holes.length}ホール ・ 記録済み {holeCountWithData}
                    </span>
                  </div>
                  <span className="course-updated">
                    {new Date(course.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </button>
                <div className="course-actions">
                  <button
                    className="link-btn"
                    onClick={() => {
                      const newName = window.prompt('コース名を変更', course.name);
                      if (newName?.trim()) renameCourse(course.id, newName);
                    }}
                  >
                    名前変更
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          `「${course.name}」を削除しますか？\nグリーン図とメモもすべて削除されます。`,
                        )
                      ) {
                        deleteCourse(course.id);
                        void deleteRemoteCourse(course.id);
                      }
                    }}
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {showForm ? (
          <div className="course-form">
            <input
              type="text"
              placeholder="コース名（例：霞ヶ関CC 東コース）"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                // IME の変換確定 Enter では作成しない（isComposing / keyCode 229）
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  create();
                }
              }}
            />
            <div className="hole-count-select">
              {[9, 18].map((n) => (
                <button
                  key={n}
                  className={`chip ${holeCount === n ? 'active' : ''}`}
                  onClick={() => setHoleCount(n)}
                >
                  {n}ホール
                </button>
              ))}
            </div>
            <div className="course-form-actions">
              <button className="btn" onClick={() => setShowForm(false)}>
                キャンセル
              </button>
              <button className="btn primary" onClick={create} disabled={!name.trim()}>
                作成
              </button>
            </div>
          </div>
        ) : (
          <button className="btn primary add-course" onClick={() => setShowForm(true)}>
            ＋ コースを追加
          </button>
        )}

        <SyncPanel />
        <StorageBadge />
      </main>
    </div>
  );
}

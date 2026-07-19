import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCourseStore } from '../stores/courseStore';

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = useCourseStore((s) => s.courses.find((c) => c.id === courseId));

  if (!course) {
    return (
      <div className="page">
        <header className="app-header">
          <Link to="/" className="back-btn">
            ‹ 戻る
          </Link>
        </header>
        <main className="page-body">
          <p className="empty-state">コースが見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header row">
        <Link to="/" className="back-btn">
          ‹
        </Link>
        <h1 className="header-title">{course.name}</h1>
      </header>

      <main className="page-body">
        <div className="hole-grid">
          {course.holes.map((hole) => {
            const hasData =
              hole.imageUrl || hole.shapes.length > 0 || hole.memos.length > 0;
            return (
              <button
                key={hole.number}
                className={`hole-cell ${hasData ? 'has-data' : ''}`}
                onClick={() =>
                  navigate(`/course/${course.id}/hole/${hole.number}`)
                }
              >
                <span className="hole-number">{hole.number}</span>
                <span className="hole-indicators">
                  {hole.imageUrl && <span title="グリーン図あり">🖼</span>}
                  {hole.shapes.length > 0 && <span title="描き込みあり">✏️</span>}
                  {hole.memos.length > 0 && (
                    <span title="メモあり">📝{hole.memos.length}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import HolePage from './pages/HolePage';
import { useCourseStore } from './stores/courseStore';
import { supabase } from './lib/supabase';
import { restoreFromCloud } from './lib/cloudRestore';
import { requestPersistentStorage } from './lib/storage';

export default function App() {
  const hydrated = useCourseStore((s) => s.hydrated);
  const [toast, setToast] = useState<string | null>(null);
  /** 復元の多重実行を防ぐ */
  const restoringRef = useRef(false);

  // 起動時に一度だけ、ブラウザによる自動削除を防ぐ「永続ストレージ」を要求する
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // ローカル復元(IndexedDB)が終わってから、クラウドから自動復元する。
  // 起動時に一度＋以降のログイン(SIGNED_IN)時に実行する。
  useEffect(() => {
    if (!hydrated || !supabase) return;

    const run = async () => {
      if (restoringRef.current) return;
      restoringRef.current = true;
      try {
        const applied = await restoreFromCloud();
        if (applied > 0) {
          setToast(`☁️ クラウドから ${applied} 件のコースを復元しました`);
          window.setTimeout(() => setToast(null), 4000);
        }
      } catch {
        // 起動時の復元失敗は致命的ではない（手動同期で回復できる）ため握りつぶす
      } finally {
        restoringRef.current = false;
      }
    };

    // 起動時（既にログイン済みならセッションあり）に一度実行
    void run();

    // ログイン完了時にも実行（INITIAL_SESSION は上の初回実行と重複するため除外）
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void run();
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrated]);

  // IndexedDB からの復元が終わるまで描画しない（空の状態のちらつき防止）
  if (!hydrated) {
    return <div className="loading">読み込み中…</div>;
  }

  return (
    <BrowserRouter>
      {toast && <div className="toast">{toast}</div>}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/course/:courseId/hole/:holeNo" element={<HolePage />} />
      </Routes>
    </BrowserRouter>
  );
}

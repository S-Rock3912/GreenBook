import { supabase } from './supabase';
import { pullCourses } from './sync';
import { useCourseStore } from '../stores/courseStore';

/**
 * クラウド(Supabase)から共有コースを取得し、ローカルストアへマージする。
 * - 未ログイン／未設定なら何もしない（0 を返す）
 * - 招待されていない場合は RLS により 0 件が返るため、実質何も起きない
 * - マージは Last-Write-Wins（updatedAt が新しい方を採用）。
 *   ローカルの未同期の編集を勝手に消さない。
 *
 * ⚠️ 必ずローカル(IndexedDB)の復元完了後に呼ぶこと。
 *    先に呼ぶと、後から来る hydrate がクラウド分を上書きしてしまう。
 *
 * @returns 取り込んだ（新規／更新された）コース件数
 */
export async function restoreFromCloud(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;

  const remote = await pullCourses();
  const { courses, upsertCourse } = useCourseStore.getState();
  let applied = 0;
  for (const rc of remote) {
    const local = courses.find((c) => c.id === rc.id);
    if (!local || rc.updatedAt > local.updatedAt) {
      upsertCourse(rc);
      applied++;
    }
  }
  return applied;
}

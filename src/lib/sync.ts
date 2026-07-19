import { supabase } from './supabase';
import type { Course } from '../types';

/**
 * 同期モデル：1コース = 1行。コース全体(ホール・図形・メモ・画像)を
 * jsonb として保存する Last-Write-Wins 方式。
 * 個人利用のグリーンブックには行単位の細かい競合解決より
 * この単純さのほうが壊れにくい。
 */

export async function pushCourses(courses: Course[]): Promise<number> {
  if (!supabase) throw new Error('Supabase が設定されていません');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('ログインが必要です');

  const rows = courses.map((c) => ({
    id: c.id,
    user_id: userData.user!.id,
    name: c.name,
    data: c,
    updated_at: c.updatedAt,
  }));

  const { error } = await supabase.from('courses').upsert(rows);
  if (error) throw new Error(`アップロード失敗: ${error.message}`);
  return rows.length;
}

export async function pullCourses(): Promise<Course[]> {
  if (!supabase) throw new Error('Supabase が設定されていません');
  const { data, error } = await supabase
    .from('courses')
    .select('data')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`ダウンロード失敗: ${error.message}`);
  return (data ?? []).map((row) => row.data as Course);
}

export async function deleteRemoteCourse(courseId: string): Promise<void> {
  if (!supabase) return; // 未設定ならローカル削除のみ
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return; // 未ログインなら黙ってスキップ
  await supabase.from('courses').delete().eq('id', courseId);
}

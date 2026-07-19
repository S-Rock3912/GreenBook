import { supabase } from './supabase';

export interface Membership {
  invited: boolean;
  admin: boolean;
  /** 判定に失敗した場合のエラー（null = 判定成功）。
   *  RPC の一時的な失敗を「未招待」と誤表示しないために使う。 */
  error: string | null;
}

export interface Invite {
  email: string;
  role: 'admin' | 'member';
  invited_at: string;
  invited_by: string | null;
}

/**
 * 現在ログイン中ユーザーの招待状態を取得する。
 * RLS を回すため DB 関数 is_invited() / is_admin() を呼ぶ。
 */
export async function getMembership(): Promise<Membership> {
  if (!supabase) return { invited: false, admin: false, error: null };
  const [invitedRes, adminRes] = await Promise.all([
    supabase.rpc('is_invited'),
    supabase.rpc('is_admin'),
  ]);
  // RPC が失敗した場合は「未招待」と断定せず、エラーとして扱う。
  // （スキーマキャッシュ未更新・ネットワーク断などを未招待と誤表示しないため）
  const err = invitedRes.error ?? adminRes.error;
  if (err) {
    return { invited: false, admin: false, error: err.message };
  }
  return {
    invited: invitedRes.data === true,
    admin: adminRes.data === true,
    error: null,
  };
}

/** 招待リストを取得（招待済みユーザーのみ閲覧可） */
export async function listInvites(): Promise<Invite[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email, role, invited_at, invited_by')
    .order('invited_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Invite[];
}

/** メールアドレスを招待（管理者のみ）。RLS で強制される。 */
export async function addInvite(
  email: string,
  role: 'admin' | 'member',
  invitedBy: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase が設定されていません');
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw new Error('メールアドレスの形式が正しくありません');
  }
  const { error } = await supabase
    .from('allowed_emails')
    .upsert({ email: clean, role, invited_by: invitedBy });
  if (error) throw new Error(error.message);
}

/** 招待を取り消す（管理者のみ） */
export async function removeInvite(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase が設定されていません');
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('email', email.toLowerCase());
  if (error) throw new Error(error.message);
}

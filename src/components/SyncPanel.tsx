import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { pullCourses, pushCourses } from '../lib/sync';
import { getMembership, type Membership } from '../lib/membership';
import InviteManager from './InviteManager';
import { useCourseStore } from '../stores/courseStore';

/**
 * クラウド共有（共有グリーンブック）。
 * - .env 未設定 → 案内のみ表示
 * - 設定済み → メールのログインリンク（マジックリンク）でログイン
 *   ログイン済みユーザーは全員で同じコース一覧を共有・編集できる（RLS: authenticated）。
 *   ログイン時に自動で「みんなの変更」を取得し、共有ボタンで自分の変更を反映する。
 */
export default function SyncPanel() {
  const { courses, upsertCourse } = useCourseStore();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  /** 招待状態（null = 判定中） */
  const [membership, setMembership] = useState<Membership | null>(null);
  /** 同一セッションで招待判定を一度だけ行うためのフラグ */
  const checkedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // 招待状態を確認する（クラウドからの自動復元は App 側で実施）。
  // 判定に失敗（RPCエラー）した場合は checked フラグを立てず、再試行できるようにする。
  const checkMembership = async () => {
    setMembership(null);
    const m = await getMembership();
    setMembership(m);
    if (m.error) {
      checkedFor.current = null; // 失敗時は再試行を許可
    }
  };

  // ログインしたら招待状態を確認（同一ユーザーで成功済みなら再実行しない）
  useEffect(() => {
    if (!session) {
      checkedFor.current = null;
      setMembership(null);
      return;
    }
    if (checkedFor.current === session.user.id) return;
    checkedFor.current = session.user.id;
    void checkMembership();
    // session 変化時のみ実行したいので依存は session に限定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!isSupabaseConfigured) {
    return (
      <details className="sync-panel">
        <summary>☁️ クラウド同期（未設定）</summary>
        <p className="sync-note">
          データはこの端末内（ブラウザの IndexedDB）に保存されています。
          機種変更やバックアップに備えて同期したい場合は、
          <code>.env</code> に Supabase の URL / anon キーを設定してください（README
          参照）。
        </p>
      </details>
    );
  }

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await fn());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const sendLink = () =>
    run(async () => {
      const { error } = await supabase!.auth.signInWithOtp({
        email,
        options: {
          // ログインリンクを「今開いているアプリのURL」に戻す
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
      setLinkSent(true);
      return 'ログインリンクをメールに送信しました';
    });

  const verifyOtp = () =>
    run(async () => {
      const { error } = await supabase!.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw new Error(error.message);
      setOtp('');
      setLinkSent(false);
      return 'ログインしました';
    });

  const push = () =>
    run(async () => {
      const n = await pushCourses(courses);
      return `${n} コースをアップロードしました`;
    });

  const pull = () =>
    run(async () => {
      const remote = await pullCourses();
      let applied = 0;
      for (const rc of remote) {
        const local = courses.find((c) => c.id === rc.id);
        // Last-Write-Wins：クラウド側が新しいものだけ取り込む
        if (!local || rc.updatedAt > local.updatedAt) {
          upsertCourse(rc);
          applied++;
        }
      }
      return `${remote.length} コースを確認、${applied} 件を更新しました`;
    });

  return (
    <details className="sync-panel" open={linkSent || undefined}>
      <summary>☁️ クラウド同期 {session ? `（${session.user.email}）` : ''}</summary>
      {!session ? (
        <div className="sync-auth">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button className="btn" onClick={sendLink} disabled={busy || !email}>
            {linkSent ? 'ログインリンクを再送信' : 'ログインリンクを送信'}
          </button>
          {linkSent && (
            <>
              <p className="sync-note">
                メールに届いたリンクを<strong>この端末のブラウザで</strong>
                開くとログインが完了します。
                メールに6桁コードが記載されている場合は、下に入力しても
                ログインできます。
              </p>
              <input
                type="text"
                inputMode="numeric"
                placeholder="確認コード（メールに記載がある場合）"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              {otp && (
                <button className="btn primary" onClick={verifyOtp} disabled={busy}>
                  コードでログイン
                </button>
              )}
            </>
          )}
        </div>
      ) : membership === null ? (
        <p className="sync-note">招待状態を確認しています…</p>
      ) : membership.error ? (
        <div className="sync-actions">
          <p className="sync-note">
            招待状態を確認できませんでした（通信エラーの可能性があります）。
            <br />
            少し待ってから、もう一度お試しください。
          </p>
          <button className="btn primary" onClick={() => void checkMembership()}>
            🔄 もう一度確認する
          </button>
          <button
            className="link-btn"
            onClick={() => supabase!.auth.signOut()}
            disabled={busy}
          >
            ログアウト
          </button>
          <p className="sync-message">詳細: {membership.error}</p>
        </div>
      ) : !membership.invited ? (
        <div className="sync-actions">
          <p className="sync-note">
            このアプリは<strong>招待制</strong>です。
            <br />
            <code>{session.user.email}</code> はまだ招待されていません。
            管理者にこのメールアドレスの招待を依頼してください。
          </p>
          <button className="btn" onClick={() => void checkMembership()}>
            🔄 再確認
          </button>
          <button
            className="link-btn"
            onClick={() => supabase!.auth.signOut()}
            disabled={busy}
          >
            別のアカウントでログイン
          </button>
        </div>
      ) : (
        <div className="sync-actions">
          <p className="sync-note">
            招待メンバー全員で 1 つのグリーンブックを共有・編集できます。
            ログイン時に最新を自動取得します。
          </p>
          <button className="btn primary" onClick={push} disabled={busy}>
            ⬆ 自分の変更をみんなに共有
          </button>
          <button className="btn" onClick={pull} disabled={busy}>
            ⬇ みんなの変更を取得
          </button>
          <button
            className="link-btn"
            onClick={() => supabase!.auth.signOut()}
            disabled={busy}
          >
            ログアウト
          </button>
          {membership.admin && (
            <InviteManager adminEmail={session.user.email ?? ''} />
          )}
        </div>
      )}
      {message && <p className="sync-message">{message}</p>}
    </details>
  );
}

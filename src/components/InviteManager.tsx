import { useEffect, useState } from 'react';
import {
  addInvite,
  listInvites,
  removeInvite,
  type Invite,
} from '../lib/membership';

interface Props {
  /** 現在ログイン中の管理者メール（invited_by 記録・自分削除防止に使う） */
  adminEmail: string;
}

/**
 * 管理者向けの招待リスト管理 UI。
 * メールを追加すると、その人はログイン後に共有グリーンブックへアクセスできる。
 */
export default function InviteManager({ adminEmail }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const reload = async () => {
    try {
      setInvites(await listInvites());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const add = async () => {
    setBusy(true);
    setMessage('');
    try {
      await addInvite(email, role, adminEmail);
      setEmail('');
      setMessage(`${email.trim().toLowerCase()} を招待しました`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (target: string) => {
    if (target.toLowerCase() === adminEmail.toLowerCase()) {
      setMessage('自分自身の招待は取り消せません');
      return;
    }
    if (!window.confirm(`${target} の招待を取り消しますか？`)) return;
    setBusy(true);
    setMessage('');
    try {
      await removeInvite(target);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="invite-manager">
      <h3 className="invite-title">👥 メンバー管理（管理者）</h3>
      <div className="invite-form">
        <input
          type="email"
          inputMode="email"
          placeholder="招待するメールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
        <div className="invite-form-row">
          <div className="role-select">
            <button
              className={`chip ${role === 'member' ? 'active' : ''}`}
              onClick={() => setRole('member')}
            >
              メンバー
            </button>
            <button
              className={`chip ${role === 'admin' ? 'active' : ''}`}
              onClick={() => setRole('admin')}
            >
              管理者
            </button>
          </div>
          <button className="btn primary" onClick={add} disabled={busy || !email}>
            招待
          </button>
        </div>
      </div>

      <ul className="invite-list">
        {invites.map((inv) => (
          <li key={inv.email} className="invite-item">
            <span className="invite-email">{inv.email}</span>
            <span className={`invite-role role-${inv.role}`}>
              {inv.role === 'admin' ? '管理者' : 'メンバー'}
            </span>
            {inv.email.toLowerCase() === adminEmail.toLowerCase() ? (
              <span className="invite-you">あなた</span>
            ) : (
              <button
                className="link-btn danger"
                onClick={() => remove(inv.email)}
                disabled={busy}
              >
                取消
              </button>
            )}
          </li>
        ))}
      </ul>

      {message && <p className="sync-message">{message}</p>}
    </div>
  );
}

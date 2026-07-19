import { useEffect, useState } from 'react';
import {
  formatBytes,
  getStorageStatus,
  requestPersistentStorage,
  type StorageStatus,
} from '../lib/storage';

/**
 * デバイス内保存の「永続化状態」と使用容量を表示する小さなバッジ。
 * 永続化が未許可のときは、ユーザー操作で再要求できるボタンを出す
 * （Firefox など、ユーザー操作起点でないと許可ダイアログが出ない環境向け）。
 */
export default function StorageBadge() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => getStorageStatus().then(setStatus);

  useEffect(() => {
    void refresh();
  }, []);

  if (!status) return null;
  if (!status.supported) return null;

  const usedText =
    status.usage != null && status.quota != null
      ? `${formatBytes(status.usage)} / ${formatBytes(status.quota)}`
      : status.usage != null
        ? formatBytes(status.usage)
        : null;

  const enable = async () => {
    setBusy(true);
    try {
      await requestPersistentStorage();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="storage-badge">
      <div className="storage-line">
        <span className={`storage-dot ${status.persisted ? 'on' : 'off'}`} />
        <span className="storage-label">
          {status.persisted
            ? 'デバイス保存: 保護あり（自動削除されにくい）'
            : 'デバイス保存: 保護なし'}
        </span>
      </div>
      {usedText && <div className="storage-usage">使用容量: {usedText}</div>}
      {!status.persisted && (
        <button className="btn small" onClick={enable} disabled={busy}>
          🔒 保護を有効にする
        </button>
      )}
    </div>
  );
}

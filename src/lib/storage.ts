/**
 * デバイス内保存（IndexedDB）の「永続化」と使用容量に関するユーティリティ。
 *
 * 既定では、端末の空き容量が逼迫するとブラウザが IndexedDB を自動削除する
 * ことがある（特に iOS Safari）。navigator.storage.persist() で「永続化」を
 * 要求しておくと、自動削除の対象から外れやすくなる。
 */

export interface StorageStatus {
  /** 永続化 API に対応しているか */
  supported: boolean;
  /** 永続化が許可されているか（true = 自動削除されにくい） */
  persisted: boolean;
  /** 使用中のバイト数（取得できなければ null） */
  usage: number | null;
  /** 割り当て上限のバイト数（取得できなければ null） */
  quota: number | null;
}

/**
 * 永続ストレージを要求する。
 * - 既に許可済みなら再要求せず true を返す
 * - 対応していない環境では false を返す
 *
 * ブラウザによって挙動が異なる:
 * - Chrome/Edge: 利用状況（PWA追加・ブックマーク・エンゲージメント）から自動判定
 * - Firefox: 初回はユーザーに許可ダイアログを表示することがある
 * - Safari: 対応が限定的で、false になることがある（それでも実害は小さい）
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** 現在の永続化状態と使用容量を取得する */
export async function getStorageStatus(): Promise<StorageStatus> {
  const supported = Boolean(navigator.storage?.persist);
  let persisted = false;
  let usage: number | null = null;
  let quota: number | null = null;

  try {
    if (navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usage = est.usage ?? null;
      quota = est.quota ?? null;
    }
  } catch {
    // 取得失敗時は既定値のまま返す
  }

  return { supported, persisted, usage, quota };
}

/** バイト数を人間が読みやすい形式にする */
export function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

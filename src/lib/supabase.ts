import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// このプロジェクトの Supabase 接続情報。
// publishable(anon) キーは公開前提のキーで、RLS で保護されており、
// ビルド後の JS バンドルにも必ず含まれるため、ソースに埋め込んでも安全。
// これにより Vercel 等で環境変数を設定しなくてもビルドがそのまま動く。
// 別プロジェクトに差し替えたい場合は、以下 or .env（VITE_SUPABASE_*）で上書きする。
const FALLBACK_URL = 'https://gohuvpsaibilciyzbncd.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_v1L2-nWzFok22-1TvajrVw_o4F6UFhm';

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON_KEY;

/**
 * Supabase クライアント。URL / キーが揃っていれば生成する
 * （フォールバックを持つため通常は常に生成される）。
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;

// 開発時のみ、デバッグ用にコンソールからクライアントを触れるようにする
if (import.meta.env.DEV && supabase) {
  (window as unknown as Record<string, unknown>).__supabase = supabase;
}

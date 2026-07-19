-- GreenBook 用スキーマ（招待制・共有グリーンブック）
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。
-- 実行後、最下部の「最初の管理者」のメールアドレスを自分のものに変更すること。

-- ============================================================
-- コース本体
-- ============================================================
create table if not exists public.courses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  -- コース全体（ホール・図形・メモ・グリーン図画像 dataURL）を丸ごと保存
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses (user_id);

alter table public.courses enable row level security;

-- ============================================================
-- 招待制（allowlist）
-- 招待されたメールアドレスの人だけが courses にアクセスできる。
-- 管理者(role='admin')が招待リストを追加・削除できる。
-- ============================================================
create table if not exists public.allowed_emails (
  email text primary key,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_at timestamptz not null default now(),
  invited_by text
);

alter table public.allowed_emails enable row level security;

-- 現在ログイン中ユーザーのメール（JWT の email クレーム、小文字化）
create or replace function public.current_email()
returns text language sql stable
security definer set search_path = public as $$
  select lower(coalesce(nullif(auth.jwt() ->> 'email', ''), ''));
$$;

-- 招待済みか？
create or replace function public.is_invited()
returns boolean language sql stable
security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = public.current_email()
  );
$$;

-- 管理者か？
create or replace function public.is_admin()
returns boolean language sql stable
security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = public.current_email() and role = 'admin'
  );
$$;

-- current_email() は他関数の内部専用（外部からは呼ばせない）。
-- is_invited()/is_admin() はログイン済みクライアントのみ RPC で呼ぶ。
revoke execute on function public.current_email() from public;
revoke execute on function public.is_invited() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_invited() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- allowed_emails のポリシー：招待済みは閲覧可、管理者のみ追加・変更・削除可
create policy "invited can read allowlist"
  on public.allowed_emails for select
  to authenticated using (public.is_invited());

create policy "admin can insert allowlist"
  on public.allowed_emails for insert
  to authenticated with check (public.is_admin());

create policy "admin can update allowlist"
  on public.allowed_emails for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin can delete allowlist"
  on public.allowed_emails for delete
  to authenticated using (public.is_admin());

-- ============================================================
-- courses のポリシー：招待済みメンバー全員で共有・編集
-- user_id 列は「最後に編集した人」の記録（所有権の境界ではない）。
-- ============================================================
create policy "invited read all courses"
  on public.courses for select
  to authenticated using (public.is_invited());

create policy "invited insert courses"
  on public.courses for insert
  to authenticated with check (public.is_invited());

create policy "invited update all courses"
  on public.courses for update
  to authenticated using (public.is_invited()) with check (public.is_invited());

create policy "invited delete all courses"
  on public.courses for delete
  to authenticated using (public.is_invited());

-- ============================================================
-- 最初の管理者を登録（★自分のメールアドレスに変更すること）
-- ============================================================
insert into public.allowed_emails (email, role, invited_by)
values ('you@example.com', 'admin', 'seed')
on conflict (email) do update set role = 'admin';

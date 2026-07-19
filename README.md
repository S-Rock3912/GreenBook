# ⛳ GreenBook — デジタルグリーンブック生成アプリ

ゴルファーが自分のグリーンブックを作れるモバイルファーストの Web アプリです。
コースごと・ホールごとにグリーン図の写真を貼り、傾斜やラインを描き込み、
プレーヤーメモを蓄積できます。

## 主な機能

- **コース管理** — コース名・ホール数（9/18H）でコースを作成、名前変更・削除
- **グリーン図エディタ**
  - グリーン図の画像（写真・スクリーンショット）を貼り付け（自動で縮小保存）
  - ペン / 直線 / 矢印 / 四角 / 円 / テキストの描き込み
  - 消しゴム（図形単位で削除）、元に戻す / やり直す、全消去
  - 6色パレット + 3段階の線幅
  - 画像がなくても白紙のグリーンとして描き込み可能
- **プレーヤーメモ** — ホールごとにカテゴリ付きメモ（パット / 傾斜 / 速さ / その他）、
  定型文チップでの素早い入力、編集・削除
- **データ保存** — デバイス内（IndexedDB）に自動保存。オフラインでも動作
- **クラウド同期（任意）** — Supabase を設定するとメールOTPログインで
  複数端末とのプッシュ / プル同期が可能

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| フロントエンド | React 18 + TypeScript + Vite |
| 状態管理 | Zustand（`persist` ミドルウェア） |
| ローカル保存 | IndexedDB（`idb-keyval`） |
| クラウド同期 | Supabase（Postgres + Auth、任意） |
| 描画 | Canvas 2D（Pointer Events、正規化座標のベクター図形） |

## フォルダ構成

```
GreenBook/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example              # Supabase 設定のテンプレート
├── scripts/
│   └── generate-icons.mjs    # PWA アイコン PNG を依存なしで生成
├── public/                   # PWA アセット（そのまま配信される）
│   ├── manifest.webmanifest  # アプリ情報・アイコン・standalone 設定
│   ├── sw.js                 # Service Worker（オフライン起動）
│   ├── icon.svg / icon-192.png / icon-512.png / apple-touch-icon.png
├── supabase/
│   └── schema.sql            # Supabase 用テーブル定義 + RLS ポリシー
└── src/
    ├── main.tsx              # エントリポイント
    ├── App.tsx               # ルーティング + ストア復元待ち
    ├── index.css             # 全スタイル（モバイルファースト）
    ├── types.ts              # Course / Hole / Shape / Memo の型定義
    ├── lib/
    │   ├── idbStorage.ts     # zustand persist 用 IndexedDB アダプタ
    │   ├── image.ts          # 画像の縮小・dataURL 変換
    │   ├── supabase.ts       # Supabase クライアント（未設定なら null）
    │   └── sync.ts           # プッシュ / プル同期（Last-Write-Wins）
    ├── stores/
    │   ├── courseStore.ts    # コース・ホール・メモの永続ストア
    │   └── editorStore.ts    # 描画ツール・色・線幅の状態
    ├── components/
    │   ├── GreenCanvas.tsx   # 描画エディタ本体（描く・消す・当たり判定）
    │   ├── Toolbar.tsx       # ツール / 色 / 線幅の選択 UI
    │   ├── MemoPanel.tsx     # プレーヤーメモの追加・編集・削除
    │   └── SyncPanel.tsx     # ログインと同期操作
    └── pages/
        ├── HomePage.tsx      # コース一覧・作成
        ├── CoursePage.tsx    # ホール一覧（1〜18H グリッド）
        └── HolePage.tsx      # グリーン図編集 + メモ（タブ切替）
```

## セットアップ

前提: Node.js 18 以上

```bash
cd GreenBook
npm install
```

### ローカルで動かす

```bash
npm run dev
```

表示された URL（例 `http://localhost:5173`）をブラウザで開きます。
`vite.config.ts` で `host: true` にしているので、同じ Wi-Fi 上のスマホから
`http://<MacのIPアドレス>:5173` でアクセスして実機確認できます。

Supabase を設定しなくても、**この時点で全機能（同期以外）が動作します。**
データはブラウザの IndexedDB に保存されます。

### 本番ビルド

```bash
npm run build    # dist/ に出力
npm run preview  # ビルド結果の確認
```

SPA なので、静的ホスティング（Vercel / Netlify / Cloudflare Pages）に
デプロイする場合は全パスを `index.html` にフォールバックさせてください。

## Supabase（接続済み）

このリポジトリは既に Supabase プロジェクトに接続済みで、`.env` も設定済みです。

| 項目 | 値 |
| --- | --- |
| プロジェクト名 | MyGreenBook |
| リージョン | ap-northeast-1（東京） |
| Project URL | `https://gohuvpsaibilciyzbncd.supabase.co` |
| Publishable key | `.env` に設定済み（RLS で保護された公開用キー） |

- `public.courses` テーブル（`id / user_id / name / data(jsonb) / updated_at`）作成済み
- `public.allowed_emails` テーブル（招待リスト）＋ `is_invited()` / `is_admin()` 関数
- **招待制の共有モデル（RLS 有効）**。**招待リストに載っているメールの人だけ**が
  コースを閲覧・編集・削除できます。招待メンバー全員で 1 つのグリーンブックを共有・編集
- メール認証（マジックリンク）でログイン → **アプリ起動時・ログイン時に自動でクラウドから復元**
  （どの画面から開いても実行。復元したら画面下部にトーストで通知）。
  手動操作はホーム下部の「☁️ クラウド同期」から「自分の変更をみんなに共有 / みんなの変更を取得」

> 自動復元はローカル(IndexedDB)の読み込み完了後に実行し、Last-Write-Wins で
> マージするため、同期前のローカル編集を消しません（[cloudRestore.ts](src/lib/cloudRestore.ts)）。

### 招待制の仕組みとメンバー管理

- 招待されていないメールでログインしても、コースは一切見えません（RLS で DB レベル拒否）
- **管理者**（`role='admin'`）は、アプリの「☁️ クラウド同期 → 👥 メンバー管理」から
  メールアドレスを追加・削除できます（メンバー / 管理者の権限も選択可）
- 最初の管理者は `sonehara.akiyoshi@gmail.com` を登録済み。別の人をオーナーにする場合は
  Supabase の SQL Editor で `allowed_emails` を編集してください
- 招待した相手は、アプリでそのメールアドレスでログインするだけで参加できます
  （事前のアカウント作成は不要。ログイン＝参加）

> 「招待制をやめて全員公開」に戻す場合は各ポリシーの `public.is_invited()` を `true` に、
> 「各自データを分離」する場合は `auth.uid() = user_id` に置き換えて再適用してください。

別の Supabase プロジェクトに差し替えたい場合は、`.env` の 2 値を書き換え、
`supabase/schema.sql` を新プロジェクトの SQL Editor で実行してください。

## PWA（ホーム画面追加・オフライン起動）

このアプリは PWA に対応しています。

- **ホーム画面に追加**できます（`manifest.webmanifest`／standalone 表示）。
  iOS Safari は「共有 → ホーム画面に追加」、Android/PC Chrome は URL バーの
  インストールアイコンから
- **オフライン起動**に対応（`public/sw.js` の Service Worker がアプリ本体を
  キャッシュ）。一度開けば、圏外・機内モードでも起動して記録できます
  - ページ遷移はネット優先→失敗時はキャッシュの `index.html`
  - JS/CSS 等の静的アセットは stale-while-revalidate
  - Supabase など**別オリジンの通信はキャッシュせず素通し**（同期は常に最新）
- ホーム画面に追加すると、**永続ストレージの許可率が上がり**、ローカルデータが
  ブラウザに自動削除されにくくなります（[storage.ts](src/lib/storage.ts)）

> Service Worker は **本番ビルドでのみ登録**します（開発時は Vite の
> モジュール配信と干渉しうるため）。ローカルで PWA を確認するには
> `npm run build && npm run preview` を使ってください。
>
> アイコンを変更したい場合は `scripts/generate-icons.mjs` を編集して
> `node scripts/generate-icons.mjs` で再生成できます（依存ライブラリ不要）。

## 公開して他の人にも使ってもらう（デプロイ）

SPA（静的サイト）なので、任意の静的ホスティングに `dist/` を配信すれば公開できます。
バックエンドは Supabase なのでサーバー用意は不要です。

### 手順

1. **ビルド**
   ```bash
   npm run build   # dist/ が生成される
   ```
2. **配信**（いずれか）
   - Vercel: リポジトリを import（Framework は Vite が自動検出）。`vercel.json` で
     SPA フォールバック済み
   - Netlify: `netlify deploy --prod --dir=dist`（SPA リダイレクトは `vercel.json`
     相当を `_redirects` に `/* /index.html 200` で用意）
   - Cloudflare Pages / GitHub Pages なども可。全パスを `index.html` にフォールバック
3. **環境変数**: ホスティング側のビルド環境にも `.env` と同じ
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定（Vite はビルド時に埋め込む）

### ⚠️ デプロイ後に必須の Supabase 設定（1 回だけ）

公開ドメインでメールログインを機能させるため、Supabase ダッシュボードで
リダイレクト先を許可します（未設定だとログインリンクが localhost に戻ってしまいます）。

**Authentication → URL Configuration** で：
- **Site URL**: 公開URL（例 `https://your-app.vercel.app`）
- **Redirect URLs** に追加: `https://your-app.vercel.app/**`
  （ローカル開発を続けるなら `http://localhost:5173/**` も残す）

これで、リンクを知っている人は誰でもアクセスでき、各自のメールでログインして
自分専用のグリーンブックをクラウド保存・複数端末同期できます（データは RLS で
ユーザーごとに完全分離）。

> メモ: 今回のセッションでは接続アカウントに Vercel プロジェクト作成権限が
> なかったため、自動デプロイは実施していません。上記の手順でご自身の
> ホスティングアカウントから公開してください。

## 設計メモ

- **ローカルファースト**: プレー中は圏外・機内モードでも使えることを最優先。
  すべての操作は即座に IndexedDB へ永続化され、同期は明示的な操作に限定
- **図形はベクターデータ**: 描き込みはビットマップではなく正規化座標
  （0〜1）の JSON として保存。画面サイズが変わっても崩れず、図形単位の
  消しゴム・Undo/Redo が可能
- **画像は縮小して保存**: スマホ写真は取り込み時に最大 1600px の JPEG に
  変換し、ストレージと同期のペイロードを小さく保つ
- **同期はコース単位の Last-Write-Wins**: 個人利用が前提のため、
  複雑なマージより「新しい方が勝つ」単純さで壊れにくさを優先

## 将来的な拡張案

1. **PWA 化** — `vite-plugin-pwa` でホーム画面追加・完全オフライン起動
2. **PDF 書き出し** — ラウンド前に紙のグリーンブックとして印刷
   （ホールごとの図 + メモを A6 レイアウトで出力）
3. **傾斜矢印テンプレート** — プロのグリーンブックのような等間隔の
   傾斜矢印グリッド、%表示の傾斜値スタンプ
4. **ピンポジション管理** — 日付ごとのピン位置を記録し、当日の
   ピンシートを再現
5. **GPS 連携** — 現在地からグリーンまでの残り距離表示
6. **ラウンド記録との統合** — パット数を記録してメモと突き合わせ、
   「このホールは3パットが多い」などの分析
7. **共有機能** — コースのグリーンブックを友人・競技仲間と共有
   （Supabase の共有テーブル + 招待リンク）
8. **リアルタイム同期** — Supabase Realtime で編集を即時反映
9. **手書き最適化** — 筆圧対応（PointerEvent.pressure）、
   スムージング（Catmull-Rom スプライン）

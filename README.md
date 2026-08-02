# おうち帳簿（Next.js + Supabase版）

夫婦2人だけで使う、PINログイン付きの家計簿アプリです。データは自分たちのSupabaseプロジェクトに保存され、Vercelにデプロイして使います。

## 1. Supabaseの準備

既存の燃費記録アプリと同じSupabaseプロジェクトを使ってOKです。テーブル名は `kakeibo_` から始まるので衝突しません。

1. Supabaseダッシュボード → 対象プロジェクト → 左メニューの **SQL Editor** を開く
2. `supabase/schema.sql` の中身を全部貼り付けて実行（テーブル作成＋初期データ投入）
3. **Settings → API** を開き、以下をメモする
   - `Project URL` → `SUPABASE_URL`
   - `service_role` キー（`anon` ではなく `service_role` の方）→ `SUPABASE_SERVICE_ROLE_KEY`
     - このキーは強い権限を持つので、**絶対にブラウザに出さない・GitHubにコミットしない**こと（このアプリではサーバー側だけで使うので安全です）

## 2. ローカルで動作確認（任意）

```bash
npm install
cp .env.example .env.local
# .env.local を開いて SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / HOUSEHOLD_PIN / COOKIE_SECRET を実際の値に書き換える
npm run dev
```

`http://localhost:3000` を開いてPINでログインできれば成功です。

## 3. GitHubにプッシュ

```bash
git init
git add .
git commit -m "おうち帳簿"
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

`.env.local` は `.gitignore` に入っているのでコミットされません（これで正しいです）。

## 4. Vercelにデプロイ

1. [vercel.com](https://vercel.com) でこのGitHubリポジトリを **Import**
2. **Environment Variables** に以下を設定
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `HOUSEHOLD_PIN`（好きなPIN。数字4〜6桁がおすすめ）
   - `COOKIE_SECRET`（32文字以上のランダムな文字列。例：`openssl rand -hex 32` で生成）
3. **Deploy** をクリック

デプロイが終わったら発行されたURLを妻と共有し、それぞれのスマホでPINを入れてもらえば使えます。ホーム画面に追加すればアプリのように使えます。

## 仕組みのメモ

- データベースへの読み書きはすべてサーバー側のAPI（`app/api/*`）経由で行い、`service_role` キーはブラウザに一切送られません。
- PINチェックはサーバー側で行い、正しければ署名付きCookieを発行します。ミドルウェア（`middleware.js`）がすべてのページ・APIをこのCookieでガードします。
- Supabase側のテーブルはRLS（行レベルセキュリティ）を有効化し、ポリシーを一切作っていないため、`service_role` 以外からの直接アクセスはすべて拒否されます。
- カテゴリ・支払い方法は「設定」タブから自由に追加・削除できます。
- レシートOCR（tesseract.js）はブラウザ内で処理され、画像は外部サーバーに送信されません。
- CSV出力、PDF出力（ブラウザの印刷機能）、グラフ（カテゴリ別割合・6か月推移）にも対応しています。

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

## 5. 今後アップデートしたいとき

コードを変更したら、GitHubにプッシュするだけでVercelが自動的に再デプロイします。

```bash
git add .
git commit -m "変更内容のメモ"
git push
```

これだけで数十秒後には本番URLに反映されます（Vercelのダッシュボードでデプロイの進み具合を確認できます）。

- **私（Claude）から新しいファイルを受け取ったとき**:該当ファイルを同じパスに上書き保存 → 上記の`git add / commit / push`
- **データベースの構造を変える変更のとき**(新しいテーブルや列の追加など):合わせて`supabase/schema.sql`の更新分をSupabaseのSQL Editorで実行するよう案内します。`schema.sql`は`if not exists`で書かれているので、ファイル全体を再実行しても安全です。
- **環境変数を追加・変更したいとき**:Vercelの Project Settings → Environment Variables で設定し、変更後は Deployments タブから **Redeploy** を実行してください（環境変数の変更は自動では反映されません）。

## 更新履歴（2026-08）

- 表紙の「今月、あと使える」を、食費・外食費・娯楽費それぞれの残りを示すミニカード表示に変更
- 支出の「店舗名」と「メモ」を別々の項目に分離
- 履歴の編集機能を追加（削除に加えて内容の修正が可能に）
- 履歴タブ上部に当月カレンダーを追加（日ごとの支出合計を表示、タップでその日だけ絞り込み）
- 「収支」タブを追加（収入・固定費を自由に追加・編集・削除。翌月は前月の内容を自動で引き継ぎ、金額だけ調整すればOK。固定費は現状手入力で、支出記録とは連動していません）
- 日付欄の幅ズレを再修正

これらを反映するには、`supabase/schema.sql`の末尾にある「追記（2026-08 update）」以降を一度SQL Editorで実行してください（`kakeibo_expenses`に`store`列を追加し、`kakeibo_budget_items`テーブルを新規作成します）。

### 追加更新（その2）

- 「収支」タブの支出を「固定費」「変動費」に分割（両方とも項目を自由に追加・編集・削除可能）
- 「資産（手残りの内訳）」を追加。現金・銀行口座などを自由に項目登録でき、合計と先月比の増減を表示
- 収入・固定費・変動費・資産のすべての項目で、同じ名前の項目があれば先月比の増減（＋/－）を自動表示
- これらを反映するには、`supabase/schema.sql`の「追記（2026-08 update その2）」以降を実行してください（`type`列に`variable`と`asset`を追加で許可します）

### 追加更新（その3）

- カード（支払い方法）一覧・カテゴリ一覧をドラッグ&ドロップで並び替えられるように（スマホのタッチ操作にも対応、並び順は自動保存）
- 登録者（入力者）を「自分」「妻」固定から、設定画面で自由に追加・編集・削除できるように変更（名前を変更すると過去の記録の表記も追従します）
- ホーム画面に追加した際のアイコン・アプリ名（おうち帳簿）を設定
- 支払い方法の初期値から「クレジットカード」の自動追加を廃止（すでにDBに入っている分は設定画面から削除してください）
- これらを反映するには、`supabase/schema.sql`の「追記（2026-08 update その3）」以降を実行してください（`kakeibo_registrants`テーブルを新規作成します）

## 仕組みのメモ

- データベースへの読み書きはすべてサーバー側のAPI（`app/api/*`）経由で行い、`service_role` キーはブラウザに一切送られません。
- PINチェックはサーバー側で行い、正しければ署名付きCookieを発行します。ミドルウェア（`middleware.js`）がすべてのページ・APIをこのCookieでガードします。
- Supabase側のテーブルはRLS（行レベルセキュリティ）を有効化し、ポリシーを一切作っていないため、`service_role` 以外からの直接アクセスはすべて拒否されます。
- カテゴリ・支払い方法は「設定」タブから自由に追加・削除・並び替え（ドラッグ&ドロップ）できます。
- 登録者（入力者）も「設定」タブから自由に追加・編集・削除できます（初期値：自分・妻）。
- レシートOCR（tesseract.js）はブラウザ内で処理され、画像は外部サーバーに送信されません。
- CSV出力、PDF出力（ブラウザの印刷機能）、グラフ（カテゴリ別割合・6か月推移）にも対応しています。

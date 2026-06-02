# Google Cloud Console セットアップ手順（初めての方用）

バーチャルオフィスの Google ログインに必要な、**プロジェクト作成から OAuth 設定まで**を順番に説明します。

所要時間の目安: 15〜20 分

---

## 事前に確認すること

- **BraveSoft の Google Workspace アカウント**（`xxx@bravesoft.co.jp`）でログインできること
- 組織によっては、**管理者のみ**が Google Cloud プロジェクトを作れる場合があります。その場合は IT 管理者にこのドキュメントを渡してください

---

## ステップ 1: Google Cloud Console にアクセス

1. ブラウザで https://console.cloud.google.com/ を開く
2. 右上のアカウントが **`@bravesoft.co.jp`** になっているか確認する
3. 初回は「利用規約に同意」などが出たら **同意して続行**

---

## ステップ 2: プロジェクトを新規作成

「プロジェクトがありません」と表示される場合は、ここから作成します。

1. 画面上部の **プロジェクト名**（または「プロジェクトを選択」）をクリック
2. 開いたウィンドウ右上の **「新しいプロジェクト」** をクリック
3. 次のように入力:

   | 項目 | 入力例 |
   |------|--------|
   | プロジェクト名 | `BraveSoft Virtual Office` |
   | 組織 | `bravesoft.co.jp` が選べれば選択（なくても可） |
   | 場所 | 組織または「組織なし」 |

4. **「作成」** をクリック
5. 作成完了まで 10〜30 秒待つ
6. 通知の **「プロジェクトに移動」** をクリック（またはプロジェクト選択で今作ったプロジェクトを選ぶ）

> **メモ:** 請求先アカウントの設定を求められても、OAuth とログインだけなら **無料枠内で利用できる**ことが多いです。組織ポリシーで必須の場合は管理者に相談してください。

---

## ステップ 3: OAuth 同意画面を設定

1. 左メニュー **「API とサービス」** → **「OAuth 同意画面」**
   - 見つからない場合: https://console.cloud.google.com/apis/credentials/consent
2. **ユーザータイプ** を選ぶ:
   - **`内部`** が選べる場合 → **内部** を選ぶ（BraveSoft 社員だけが使える・おすすめ）
   - 選べない場合 → **外部**（後でテストユーザーを追加）
3. **「作成」** をクリック
4. **アプリ情報**（1 ページ目）:

   | 項目 | 入力例 |
   |------|--------|
   | アプリ名 | `バーチャルオフィス` |
   | ユーザーサポートメール | 自分の `@bravesoft.co.jp` |
   | デベロッパーの連絡先情報 | 自分の `@bravesoft.co.jp` |

5. **「保存して次へ」**
6. **スコープ** → **「スコープを追加または削除」** をクリックし、次を追加:
   - `https://www.googleapis.com/auth/calendar.readonly`（Google カレンダーの予定を読み取り）
7. **「更新」** → **「保存して次へ」**
8. **テストユーザー**（外部を選んだ場合のみ）→ 使う人の `@bravesoft.co.jp` を追加
9. **「保存して次へ」** → **「ダッシュボードに戻る」**

---

## ステップ 3.5: Google Calendar API を有効化

オフィス上の吹き出しに今日の予定を表示するために必要です。

1. 左メニュー **「API とサービス」** → **「ライブラリ」**
2. **「Google Calendar API」** を検索
3. **「Google Calendar API」** を選択 → **「有効にする」**

---

## ステップ 4: OAuth クライアント ID を作成

1. 左メニュー **「API とサービス」** → **「認証情報」**
   - 直接: https://console.cloud.google.com/apis/credentials
2. 上部 **「+ 認証情報を作成」** → **「OAuth クライアント ID」**
3. **アプリケーションの種類:** **ウェブアプリケーション**
4. **名前:** `Virtual Office Web`
5. **承認済みの JavaScript 生成元** に **「URI を追加」** で次を入れる:

   ```
   https://virtual-office-fydb.onrender.com
   http://localhost:5173
   http://localhost:5174
   ```

   > 本番 URL が変わった場合は、その URL も追加してください。

6. **承認済みのリダイレクト URI** は、このアプリでは **空で OK**（Google ボタン方式のため不要）
7. **「作成」** をクリック
8. 表示される **クライアント ID** をコピーする  
   （例: `123456789-xxxx.apps.googleusercontent.com`）  
   **クライアント シークレットはこのアプリでは不要**（サーバーは ID トークン検証のみ）

---

## ステップ 5: Render（本番）に環境変数を設定

1. https://dashboard.render.com/web/srv-d8f5nad53gjs739njuk0 を開く
2. 左メニュー **「Environment」**
3. 次を追加:

   | Key | Value |
   |-----|--------|
   | `GOOGLE_CLIENT_ID` | コピーしたクライアント ID |
   | `JWT_SECRET` | ランダムな文字列（下記コマンドで生成可） |
   | `ALLOWED_EMAIL_DOMAIN` | `bravesoft.co.jp` |

   **JWT_SECRET の生成例（Mac ターミナル）:**

   ```bash
   openssl rand -base64 32
   ```

4. **「Save Changes」** → 再デプロイが始まる

---

## ステップ 6: ローカル開発用（任意）

プロジェクトルートで:

```bash
export GOOGLE_CLIENT_ID="ここにクライアントID"
export JWT_SECRET="ローカル用の秘密鍵"
cd /Users/k.kai/project/virtual-office
npm run dev
```

ブラウザで http://localhost:5173 を開き、**@bravesoft.co.jp** でログインできるか確認します。

---

## よくあるエラー

| 表示 | 対処 |
|------|------|
| `Google ログインが未設定` | Render の `GOOGLE_CLIENT_ID` が未設定 or デプロイ前 |
| `redirect_uri_mismatch` | JavaScript 生成元に **今開いている URL** が入っているか確認 |
| `access_denied` / ドメインエラー | `@bravesoft.co.jp` 以外のアカウントでログインしていないか確認 |
| `内部` が選べない | 外部 + テストユーザー追加、または管理者に Workspace 連携を依頼 |
| プロジェクトを作れない | 組織ポリシー。Google Workspace 管理者にプロジェクト作成権限を依頼 |

---

## 管理者向け（Google Workspace）

BraveSoft 全体で使う場合:

1. **Google Workspace 管理コンソール** で、開発用 OAuth アプリの利用が許可されているか確認
2. 必要なら **内部** アプリとして登録（第三者へのデータ提供なし）
3. 社員には本番 URL `https://virtual-office-fydb.onrender.com` を共有

---

## チェックリスト

- [ ] Google Cloud でプロジェクトを作成した
- [ ] OAuth 同意画面を設定した（内部 or 外部+テストユーザー）
- [ ] OAuth クライアント ID（ウェブ）を作成した
- [ ] JavaScript 生成元に本番 URL と localhost を追加した
- [ ] Render に `GOOGLE_CLIENT_ID` と `JWT_SECRET` を設定した
- [ ] 本番 URL で `@bravesoft.co.jp` でログインできた

# 本番デプロイ手順

バーチャルオフィスは **1台のサーバー** でフロント（React）と Socket.io / WebRTC シグナリングをまとめて配信します。HTTPS 上で動作するため、他のユーザーと URL を共有するだけで利用できます。

## 前提

- **HTTPS 必須** — マイク・WebRTC はブラウザのセキュリティ上、HTTPS（または localhost）でのみ動作します
- **Google ログイン必須** — `@bravesoft.co.jp` の Google Workspace アカウントのみ入室可能
- **本番ではデモボットはオフ** — 実ユーザー同士の利用が前提です（`ENABLE_DEMO_BOTS=true` で再有効化可）
- **音声が繋がらない場合** — 企業ネットワーク等では [TURN サーバー](#webrtc-turn-任意) の設定が必要なことがあります

---

## Google OAuth の設定（必須）

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) でプロジェクトを作成
2. **OAuth 同意画面** — 社内アプリ（Internal）推奨、ユーザータイプは組織内
3. **認証情報** → **OAuth 2.0 クライアント ID** → **ウェブアプリケーション**
4. **承認済みの JavaScript 生成元** に以下を追加:
   - `https://virtual-office-fydb.onrender.com`（本番 URL）
   - `http://localhost:5173` / `http://localhost:5174`（ローカル開発）
5. Render（またはサーバー）の環境変数:

| 変数 | 説明 |
|------|------|
| `GOOGLE_CLIENT_ID` | OAuth クライアント ID（`*.apps.googleusercontent.com`） |
| `JWT_SECRET` | セッション署名用のランダム文字列（32文字以上推奨） |
| `ALLOWED_EMAIL_DOMAIN` | `bravesoft.co.jp`（デフォルト） |

ローカル開発では `server/.env` またはプロジェクトルートの `.env` を `tsx` が読むようにはしていないため、起動前に export するか `dotenv` を追加してください。簡易的に:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export JWT_SECRET="local-dev-secret"
npm run dev
```

---

## 方法 A: Render.com（おすすめ・無料枠あり）

1. このプロジェクトを **GitHub** にプッシュする
2. [Render](https://render.com) にログイン → **New** → **Blueprint**
3. リポジトリを選択（`render.yaml` を自動検出）
4. デプロイ完了後、表示された URL（例: `https://virtual-office-xxxx.onrender.com`）をチームに共有

### 手動で Web サービスを作る場合

| 項目 | 値 |
|------|-----|
| Runtime | Docker |
| Build | （Dockerfile 使用） |
| Health Check Path | `/health` |
| 環境変数 `NODE_ENV` | `production` |
| 環境変数 `ENABLE_DEMO_BOTS` | `false` |

---

## 方法 B: Railway

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub**
2. リポジトリを選択
3. **Settings** → **Deploy** で Dockerfile を使用
4. 環境変数:
   - `NODE_ENV=production`
   - `ENABLE_DEMO_BOTS=false`
5. **Networking** → **Generate Domain** で公開 URL を取得

---

## 方法 C: 自社 VPS（Docker）

```bash
cd virtual-office
docker build -t virtual-office .
docker run -d -p 3001:3001 \
  -e NODE_ENV=production \
  -e ENABLE_DEMO_BOTS=false \
  --name virtual-office \
  virtual-office
```

手前に **nginx** や **Caddy** で HTTPS 終端を行い、`https://office.example.com` → `localhost:3001` にプロキシしてください。

### Caddy 例

```
office.example.com {
  reverse_proxy localhost:3001
}
```

---

## 方法 D: ローカルで本番ビルドの動作確認

```bash
cd virtual-office
npm install
npm run build
NODE_ENV=production ENABLE_DEMO_BOTS=false npm start
```

ブラウザで http://localhost:3001 を開き、**別ブラウザ／シークレットウィンドウ**でもう1人入室して音声を確認します。

---

## WebRTC TURN（任意）

社内ファイアウォール越えで音声が繋がらない場合、無料枠のある TURN を利用できます。

1. [Metered.ca](https://www.metered.ca/tools/openrelay/) などで TURN 資格情報を取得
2. デプロイ先の環境変数（ビルド時に埋め込む場合は **ビルド前** に設定）:

```
VITE_TURN_URL=turn:global.relay.metered.ca:80
VITE_TURN_USERNAME=取得したユーザー名
VITE_TURN_CREDENTIAL=取得したパスワード
```

Render / Railway では **Docker ビルド引数** または `client` をビルドする CI ステップで `VITE_*` を渡してください。

---

## 環境変数一覧

| 変数 | 本番の推奨 | 説明 |
|------|------------|------|
| `NODE_ENV` | `production` | 静的ファイル配信・本番モード |
| `PORT` | プラットフォーム指定 | リッスンポート（Render は自動） |
| `ENABLE_DEMO_BOTS` | `false` | デモメンバー5人の有無 |
| `ALLOWED_ORIGINS` | 未設定で可 | API を別ドメインから叩く場合のみ |
| `VITE_SERVER_URL` | 未設定で可 | 同一サーバー配信なら不要 |
| `VITE_TURN_*` | 必要時のみ | WebRTC リレー |

---

## チームへの共有

デプロイ後、次の URL を共有してください。

```
https://＜あなたのドメイン＞/
```

利用者は表示名を入力して入室するだけです。認証は現状ありません。社内限定にする場合は、Render の **Private Service**、Basic 認証付きリバースプロキシ、VPN などで保護してください。

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| 接続できない | `/health` が `{"ok":true}` を返すか確認 |
| 他の人が見えない | 同じ URL か、WSS がブロックされていないか確認 |
| 音声だけ繋がらない | マイク許可、HTTPS、TURN 設定を確認 |
| すぐ切断される | 無料プランのスリープ → 有料プラン or 常時起動の VPS |

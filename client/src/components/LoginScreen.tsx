import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

interface LoginScreenProps {
  allowedDomain: string;
  loading: boolean;
  error: string | null;
  onLogin: (credential: string) => Promise<void>;
}

export function LoginScreen({ allowedDomain, loading, error, onLogin }: LoginScreenProps) {
  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      await onLogin(response.credential);
    } catch {
      /* error set by parent */
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-icon">🏢</div>
        <h1>バーチャルオフィス</h1>
        <p className="lobby-desc">
          BraveSoft 社員専用のバーチャル空間です。
          <br />
          <strong>@{allowedDomain}</strong> の Google アカウントでログインしてください。
        </p>

        {error && <p className="login-error">{error}</p>}

        {loading ? (
          <p className="login-loading">読み込み中...</p>
        ) : (
          <div className="google-login-wrap">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => {}}
              hosted_domain={allowedDomain}
              useOneTap={false}
              text="signin_with"
              shape="rectangular"
              theme="outline"
              size="large"
              locale="ja"
            />
          </div>
        )}

        <ul className="lobby-hints">
          <li>会社の Google（Gmail）アカウントが必要です</li>
          <li>個人の Gmail ではログインできません</li>
          <li>ログイン後、2D オフィスで同僚と音声チャット</li>
          <li>カレンダー連携で今日の予定を吹き出しに表示</li>
        </ul>
      </div>
    </div>
  );
}

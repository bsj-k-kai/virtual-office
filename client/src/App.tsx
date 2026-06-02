import { GoogleOAuthProvider } from "@react-oauth/google";
import { useSocket } from "./hooks/useSocket";
import { useWebRTC } from "./hooks/useWebRTC";
import { useDemoBotAudio } from "./hooks/useDemoBotAudio";
import { useMyPositionRef } from "./hooks/useMyPositionRef";
import { useMicVolume } from "./hooks/useMicVolume";
import { useAuth } from "./hooks/useAuth";
import { useCalendarSync } from "./hooks/useCalendarSync";
import { LoginScreen } from "./components/LoginScreen";
import { OfficeMap } from "./components/OfficeMap";
import "./App.css";

function OfficeApp({
  sessionToken,
  userEmail,
  onLogout,
}: {
  sessionToken: string;
  userEmail: string;
  onLogout: () => void;
}) {
  const { socket, connected, me, users, move, setStatus, authError } = useSocket(
    sessionToken,
    true
  );
  const { calendarError, calendarLinked, syncCalendar } = useCalendarSync(
    socket,
    connected && !!me,
    me?.isBot
  );
  const myPosRef = useMyPositionRef(me);
  const { micVolume, setMicVolume } = useMicVolume();
  const { nearbyIds } = useWebRTC(socket, me, users, myPosRef, micVolume);
  const { playingBotIds } = useDemoBotAudio(me, users, myPosRef);

  if (!me) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <p className="login-loading">
            {authError || (connected ? "オフィスに入室中..." : "接続中...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header-title">🏢 バーチャルオフィス</span>
        <div className="header-right">
          <span className="header-user" title={userEmail}>
            {me.picture && (
              <img src={me.picture} alt="" className="header-avatar" />
            )}
            {me.name}
          </span>
          <button type="button" className="logout-btn" onClick={onLogout}>
            ログアウト
          </button>
          <span className={`connection ${connected ? "on" : "off"}`}>
            {connected ? "● 接続中" : "○ 切断"}
          </span>
        </div>
      </header>
      <OfficeMap
        me={me}
        users={users}
        nearbyIds={nearbyIds}
        playingBotIds={playingBotIds}
        myPosRef={myPosRef}
        micVolume={micVolume}
        onMicVolumeChange={setMicVolume}
        onMove={move}
        onStatusChange={setStatus}
        calendarError={calendarError}
        calendarLinked={calendarLinked}
        onCalendarSync={() => syncCalendar(true)}
      />
    </div>
  );
}

function App() {
  const {
    user,
    token,
    googleClientId,
    allowedDomain,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    setError,
  } = useAuth();

  const handleLogin = async (credential: string) => {
    try {
      await login(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
      throw e;
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <p className="login-loading">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <p className="login-error">{error || "Google ログインが未設定です"}</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {!isAuthenticated || !token ? (
        <LoginScreen
          allowedDomain={allowedDomain}
          loading={false}
          error={error}
          onLogin={handleLogin}
        />
      ) : (
        <OfficeApp
          sessionToken={token}
          userEmail={user!.email}
          onLogout={handleLogout}
        />
      )}
    </GoogleOAuthProvider>
  );
}

export default App;

import { useSocket } from "./hooks/useSocket";
import { useWebRTC } from "./hooks/useWebRTC";
import { useDemoBotAudio } from "./hooks/useDemoBotAudio";
import { useMyPositionRef } from "./hooks/useMyPositionRef";
import { useMicVolume } from "./hooks/useMicVolume";
import { Lobby } from "./components/Lobby";
import { OfficeMap } from "./components/OfficeMap";
import "./App.css";

function App() {
  const { socket, connected, me, users, join, move, setStatus } = useSocket();
  const myPosRef = useMyPositionRef(me);
  const { micVolume, setMicVolume } = useMicVolume();
  const { nearbyIds } = useWebRTC(socket, me, users, myPosRef, micVolume);
  const { playingBotIds } = useDemoBotAudio(me, users, myPosRef);

  if (!me) {
    return <Lobby connected={connected} onJoin={join} />;
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header-title">🏢 バーチャルオフィス</span>
        <span className={`connection ${connected ? "on" : "off"}`}>
          {connected ? "● 接続中" : "○ 切断"}
        </span>
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
      />
    </div>
  );
}

export default App;

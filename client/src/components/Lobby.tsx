import { useState } from "react";
import { AVATAR_COLORS } from "../types";

interface LobbyProps {
  connected: boolean;
  onJoin: (name: string, color: string) => void;
}

export function Lobby({ connected, onJoin }: LobbyProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    onJoin(name.trim(), color);
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-icon">🏢</div>
        <h1>バーチャルオフィス</h1>
        <p className="lobby-desc">
          2D空間を歩き回り、近くにいる同僚と自動で音声がつながります。
          <br />
          オフィスにいるような気軽さで、リモートでも話しかけられます。
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="表示名を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
          />
          <button type="submit" disabled={!connected || !name.trim()}>
            {connected ? "オフィスに入る" : "接続中..."}
          </button>
        </form>
        <ul className="lobby-hints">
          <li>矢印キー / WASD で移動</li>
          <li>近くに寄ると音声が自動接続</li>
          <li>「取り込み中」は話しかけ不可</li>
        </ul>
      </div>
    </div>
  );
}

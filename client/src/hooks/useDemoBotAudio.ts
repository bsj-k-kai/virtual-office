import { useEffect, useRef, useState } from "react";
import type { User } from "../types";
import { PROXIMITY_RADIUS } from "../types";
import { DemoMusicPlayer, getAudioContext, botIndexFromId } from "../audio/demoMusic";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useDemoBotAudio(me: User | null, users: User[]) {
  const playersRef = useRef<Map<string, DemoMusicPlayer>>(new Map());
  const [playingBotIds, setPlayingBotIds] = useState<string[]>([]);

  useEffect(() => {
    if (!me) return;

    let cancelled = false;

    const sync = async () => {
      const ctx = await getAudioContext();
      if (cancelled) return;

      const inRange = users.filter(
        (u) =>
          u.isBot &&
          u.status !== "busy" &&
          distance(me, u) < PROXIMITY_RADIUS
      );

      const inRangeIds = new Set(inRange.map((u) => u.id));
      const currentIds = new Set(playersRef.current.keys());

      for (const bot of inRange) {
        const dist = distance(me, bot);
        const volume = 0.15 + 0.35 * (1 - dist / PROXIMITY_RADIUS);

        let player = playersRef.current.get(bot.id);
        if (!player) {
          player = new DemoMusicPlayer(ctx, botIndexFromId(bot.id));
          playersRef.current.set(bot.id, player);
          await player.fadeIn(volume);
        } else {
          player.setVolume(volume);
        }
      }

      for (const id of currentIds) {
        if (!inRangeIds.has(id)) {
          playersRef.current.get(id)?.fadeOut();
          playersRef.current.delete(id);
        }
      }

      setPlayingBotIds(inRange.map((u) => u.id));
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [me, users]);

  useEffect(() => {
    return () => {
      playersRef.current.forEach((p) => p.dispose());
      playersRef.current.clear();
    };
  }, []);

  return { playingBotIds };
}

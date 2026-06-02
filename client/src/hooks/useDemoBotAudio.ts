import { useEffect, useRef, useState } from "react";
import type { User } from "../types";
import { PROXIMITY_RADIUS } from "../types";
import { DemoMusicPlayer, getAudioContext, botIndexFromId } from "../audio/demoMusic";
import {
  distanceBetween,
  demoMusicVolumeFromDistance,
} from "../audio/spatialVolume";

export function useDemoBotAudio(
  me: User | null,
  users: User[],
  myPosRef: React.RefObject<{ x: number; y: number }>
) {
  const playersRef = useRef<Map<string, DemoMusicPlayer>>(new Map());
  const usersRef = useRef(users);
  const [playingBotIds, setPlayingBotIds] = useState<string[]>([]);

  usersRef.current = users;

  useEffect(() => {
    if (!me) return;

    let cancelled = false;
    let rafId = 0;

    const sync = async () => {
      const ctx = await getAudioContext();
      if (cancelled) return;

      const myPos = myPosRef.current;
      const list = usersRef.current;
      const inRange = list.filter(
        (u) =>
          u.isBot &&
          u.status !== "busy" &&
          distanceBetween(myPos, u) < PROXIMITY_RADIUS
      );

      const inRangeIds = new Set(inRange.map((u) => u.id));
      const currentIds = new Set(playersRef.current.keys());

      for (const bot of inRange) {
        const dist = distanceBetween(myPos, bot);
        const volume = demoMusicVolumeFromDistance(dist);

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

      const ids = inRange.map((u) => u.id);
      setPlayingBotIds((prev) =>
        prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids
      );
    };

    const tick = () => {
      sync();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [me, myPosRef]);

  useEffect(() => {
    return () => {
      playersRef.current.forEach((p) => p.dispose());
      playersRef.current.clear();
    };
  }, []);

  return { playingBotIds };
}

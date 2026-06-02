import { useRef, useEffect } from "react";
import type { User } from "../types";

/** フレームごとの自分の座標（音量計算用・再レンダリングなし） */
export function useMyPositionRef(me: User | null) {
  const ref = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (me) {
      ref.current = { x: me.x, y: me.y };
    }
  }, [me?.x, me?.y, me]);

  return ref;
}

import { useEffect, useRef, useCallback, useState } from "react";
import type { Socket } from "socket.io-client";
import type { User } from "../types";
import { PROXIMITY_RADIUS } from "../types";
import { getIceServers } from "../config";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useWebRTC(
  socketRef: React.RefObject<Socket | null>,
  me: User | null,
  users: User[]
) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);

  const initStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      console.warn("マイクへのアクセスが拒否されました");
      return null;
    }
  }, []);

  const createPeer = useCallback(
    async (remoteId: string, initiator: boolean) => {
      if (peersRef.current.has(remoteId)) return;

      const stream = await initStream();
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        let audio = audioElsRef.current.get(remoteId);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audioElsRef.current.set(remoteId, audio);
          document.body.appendChild(audio);
        }
        audio.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("signal", {
            to: remoteId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      peersRef.current.set(remoteId, pc);

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("signal", {
          to: remoteId,
          signal: { type: "offer", sdp: offer },
        });
      }
    },
    [initStream, socketRef]
  );

  const removePeer = useCallback((remoteId: string) => {
    const pc = peersRef.current.get(remoteId);
    if (pc) {
      pc.close();
      peersRef.current.delete(remoteId);
    }
    const audio = audioElsRef.current.get(remoteId);
    if (audio) {
      audio.remove();
      audioElsRef.current.delete(remoteId);
    }
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !me) return;

    const onSignal = async ({
      from,
      signal,
    }: {
      from: string;
      signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    }) => {
      if (signal.type === "offer" && signal.sdp) {
        await createPeer(from, false);
        const pc = peersRef.current.get(from)!;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { to: from, signal: { type: "answer", sdp: answer } });
      } else if (signal.type === "answer" && signal.sdp) {
        const pc = peersRef.current.get(from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        const pc = peersRef.current.get(from);
        if (pc && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    };

    socket.on("signal", onSignal);
    return () => {
      socket.off("signal", onSignal);
    };
  }, [socketRef, me, createPeer]);

  useEffect(() => {
    if (!me) return;

    const nearby = users
      .filter(
        (u) =>
          u.id !== me.id &&
          !u.isBot &&
          u.status !== "busy" &&
          distance(me, u) < PROXIMITY_RADIUS
      )
      .map((u) => u.id);

    setNearbyIds(nearby);

    const currentPeerIds = new Set(peersRef.current.keys());
    const nearbySet = new Set(nearby);

    for (const id of nearby) {
      if (!currentPeerIds.has(id)) {
        const shouldInitiate = me.id < id;
        createPeer(id, shouldInitiate);
      }
    }

    for (const id of currentPeerIds) {
      if (!nearbySet.has(id)) {
        removePeer(id);
      }
    }
  }, [me, users, createPeer, removePeer]);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((_, id) => removePeer(id));
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [removePeer]);

  return { nearbyIds };
}

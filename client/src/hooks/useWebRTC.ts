import { useEffect, useRef, useCallback, useState } from "react";
import type { Socket } from "socket.io-client";
import type { User } from "../types";
import { PROXIMITY_RADIUS } from "../types";
import { getIceServers } from "../config";
import { distanceBetween, volumeFromDistance } from "../audio/spatialVolume";
import { MicPipeline } from "../audio/micPipeline";

export function useWebRTC(
  socketRef: React.RefObject<Socket | null>,
  me: User | null,
  users: User[],
  myPosRef: React.RefObject<{ x: number; y: number }>,
  micVolume: number
) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const micPipelineRef = useRef<MicPipeline | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const usersRef = useRef(users);
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);

  usersRef.current = users;

  const applySpatialVolumes = useCallback(() => {
    const myPos = myPosRef.current;
    const list = usersRef.current;
    for (const [id, audio] of audioElsRef.current) {
      const user = list.find((u) => u.id === id);
      if (!user) continue;
      const dist = distanceBetween(myPos, user);
      audio.volume = volumeFromDistance(dist);
    }
  }, [myPosRef]);

  const initStream = useCallback(async () => {
    if (!micPipelineRef.current) {
      micPipelineRef.current = new MicPipeline();
    }
    const stream = await micPipelineRef.current.init();
    return stream;
  }, []);

  useEffect(() => {
    if (!me) return;
    initStream();
  }, [me, initStream]);

  useEffect(() => {
    micPipelineRef.current?.setOutputSlider(micVolume);
  }, [micVolume]);

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
        applySpatialVolumes();
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
    [initStream, socketRef, applySpatialVolumes]
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
          distanceBetween(myPosRef.current, u) < PROXIMITY_RADIUS
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
  }, [me, users, createPeer, removePeer, myPosRef]);

  useEffect(() => {
    if (!me) return;
    let rafId = 0;
    const tick = () => {
      applySpatialVolumes();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [me, applySpatialVolumes]);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((_, id) => removePeer(id));
      micPipelineRef.current?.dispose();
      micPipelineRef.current = null;
    };
  }, [removePeer]);

  return { nearbyIds };
}

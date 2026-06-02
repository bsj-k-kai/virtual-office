import { PROXIMITY_RADIUS, AVATAR_SIZE } from "../types";

/** アバター中心付近で最大音量になるまでの距離 */
const MIN_DISTANCE = AVATAR_SIZE;
/** 2 = 距離の二乗に反比例する減衰（現実の音の広がりに近い） */
const FALLOFF_EXPONENT = 2;

export function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 距離から音量 (0–1) を算出。
 * 至近距離で最大、PROXIMITY_RADIUS の境界で 0 になる滑らかな減衰。
 */
export function volumeFromDistance(
  dist: number,
  maxDist: number = PROXIMITY_RADIUS
): number {
  if (dist >= maxDist) return 0;

  const effective = Math.max(dist, MIN_DISTANCE);
  const range = maxDist - MIN_DISTANCE;
  if (range <= 0) return 0;

  const linear = 1 - (effective - MIN_DISTANCE) / range;
  return Math.pow(Math.max(0, linear), FALLOFF_EXPONENT);
}

/** デモ音楽用（ベース音量を抑えつつ距離減衰を適用） */
export function demoMusicVolumeFromDistance(dist: number): number {
  return volumeFromDistance(dist) * 0.55;
}

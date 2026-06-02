/** スライダー中央 = 通常のマイク音量（相手への出力 100%） */
export const MIC_VOLUME_DEFAULT = 50;
export const MIC_VOLUME_MIN = 0;
export const MIC_VOLUME_MAX = 100;

/** スライダー値 → 相手に届く出力ゲイン（0〜1、50 以上は 1 で頭打ち） */
export function micSliderToGain(slider: number): number {
  const clamped = Math.max(MIC_VOLUME_MIN, Math.min(MIC_VOLUME_MAX, slider));
  if (clamped >= MIC_VOLUME_DEFAULT) return 1;
  return clamped / MIC_VOLUME_DEFAULT;
}

export function loadMicVolumeSlider(): number {
  try {
    const raw = localStorage.getItem("virtual-office-mic-volume");
    if (raw == null) return MIC_VOLUME_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n)
      ? Math.max(MIC_VOLUME_MIN, Math.min(MIC_VOLUME_MAX, Math.round(n)))
      : MIC_VOLUME_DEFAULT;
  } catch {
    return MIC_VOLUME_DEFAULT;
  }
}

export function saveMicVolumeSlider(slider: number) {
  try {
    localStorage.setItem("virtual-office-mic-volume", String(slider));
  } catch {
    /* ignore */
  }
}

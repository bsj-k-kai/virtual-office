import { useState, useCallback } from "react";
import {
  MIC_VOLUME_DEFAULT,
  loadMicVolumeSlider,
  saveMicVolumeSlider,
  micSliderToGain,
} from "../audio/micVolume";

export function useMicVolume() {
  const [micVolume, setMicVolumeState] = useState(loadMicVolumeSlider);

  const setMicVolume = useCallback((value: number) => {
    setMicVolumeState(value);
    saveMicVolumeSlider(value);
  }, []);

  return {
    micVolume,
    setMicVolume,
    micOutputGain: micSliderToGain(micVolume),
    isDefault: micVolume === MIC_VOLUME_DEFAULT,
  };
}

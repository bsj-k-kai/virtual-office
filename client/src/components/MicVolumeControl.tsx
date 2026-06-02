import {
  MIC_VOLUME_DEFAULT,
  MIC_VOLUME_MAX,
  MIC_VOLUME_MIN,
  micSliderToGain,
} from "../audio/micVolume";

interface MicVolumeControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function MicVolumeControl({ value, onChange }: MicVolumeControlProps) {
  const gain = micSliderToGain(value);
  const percent = Math.round(gain * 100);

  return (
    <div className="mic-volume-control">
      <div className="mic-volume-header">
        <h3>🎤 マイク出力</h3>
        <span className="mic-volume-value" title="相手に届く音量">
          {value < MIC_VOLUME_DEFAULT
            ? `${percent}%`
            : value === MIC_VOLUME_DEFAULT
              ? "標準"
              : "標準"}
        </span>
      </div>
      <p className="mic-volume-desc">中央が通常音量。下げると相手に届く声が小さくなります。</p>
      <input
        type="range"
        className="mic-volume-slider"
        min={MIC_VOLUME_MIN}
        max={MIC_VOLUME_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="マイク出力音量"
        style={
          {
            "--mic-fill": `${(value / MIC_VOLUME_MAX) * 100}%`,
            "--mic-mid": `${(MIC_VOLUME_DEFAULT / MIC_VOLUME_MAX) * 100}%`,
          } as React.CSSProperties
        }
      />
      <div className="mic-volume-labels">
        <span>小</span>
        <span className="mic-mid-mark">標準</span>
        <span>標準</span>
      </div>
    </div>
  );
}

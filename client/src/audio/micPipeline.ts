import { micSliderToGain, MIC_VOLUME_DEFAULT } from "./micVolume";

/** マイク入力を GainNode で加工し、WebRTC 送信用ストリームを生成 */
export class MicPipeline {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private rawStream: MediaStream | null = null;
  private outputSlider = MIC_VOLUME_DEFAULT;

  async init(): Promise<MediaStream | null> {
    if (this.dest?.stream) return this.dest.stream;

    try {
      this.rawStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch {
      console.warn("マイクへのアクセスが拒否されました");
      return null;
    }

    this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.source = this.ctx.createMediaStreamSource(this.rawStream);
    this.gain = this.ctx.createGain();
    this.dest = this.ctx.createMediaStreamDestination();

    this.source.connect(this.gain);
    this.gain.connect(this.dest);

    this.applyGain(micSliderToGain(this.outputSlider));
    return this.dest.stream;
  }

  getStream(): MediaStream | null {
    return this.dest?.stream ?? null;
  }

  setOutputSlider(slider: number) {
    this.outputSlider = slider;
    this.applyGain(micSliderToGain(slider));
  }

  private applyGain(value: number) {
    if (!this.gain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(value, now + 0.05);
  }

  dispose() {
    this.source?.disconnect();
    this.gain?.disconnect();
    this.dest?.disconnect();
    this.rawStream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.source = null;
    this.gain = null;
    this.dest = null;
    this.rawStream = null;
    this.ctx = null;
  }
}

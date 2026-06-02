/** デモメンバーごとのループ音楽（Web Audio API） */

const MELODIES: number[][] = [
  [262, 330, 392, 523], // 田中 — C major arpeggio
  [294, 370, 440, 587], // 鈴木 — D
  [330, 415, 494, 659], // 佐藤
  [349, 440, 523, 698], // 山田
  [392, 494, 587, 784], // 伊藤
];

export class DemoMusicPlayer {
  private ctx: AudioContext;
  private gain: GainNode;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;
  private readonly notes: number[];
  private activeOsc: OscillatorNode[] = [];

  constructor(ctx: AudioContext, botIndex: number) {
    this.ctx = ctx;
    this.notes = MELODIES[botIndex % MELODIES.length];
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
  }

  async fadeIn(targetVolume = 0.35) {
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(targetVolume, now + 0.3);
    if (!this.intervalId) this.startLoop();
  }

  fadeOut() {
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + 0.25);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    setTimeout(() => this.stopOscillators(), 300);
  }

  setVolume(volume: number) {
    const now = this.ctx.currentTime;
    const target = Math.min(0.85, Math.max(0, volume));
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(target, now + 0.06);
  }

  dispose() {
    this.fadeOut();
    setTimeout(() => this.gain.disconnect(), 400);
  }

  private startLoop() {
    this.playNote();
    this.intervalId = setInterval(() => this.playNote(), 420);
  }

  private playNote() {
    const freq = this.notes[this.noteIndex % this.notes.length];
    this.noteIndex++;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    noteGain.gain.value = 0.12;
    noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);
    osc.connect(noteGain);
    noteGain.connect(this.gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
    this.activeOsc.push(osc);
    osc.onended = () => {
      this.activeOsc = this.activeOsc.filter((o) => o !== osc);
      noteGain.disconnect();
    };
  }

  private stopOscillators() {
    this.activeOsc.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    this.activeOsc = [];
  }
}

let sharedCtx: AudioContext | null = null;

export async function getAudioContext(): Promise<AudioContext> {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === "suspended") {
    await sharedCtx.resume();
  }
  return sharedCtx;
}

export function botIndexFromId(id: string): number {
  const n = Number(id.replace("bot-", ""));
  return Number.isFinite(n) ? n : 0;
}

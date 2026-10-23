import { Injectable } from '@angular/core';

// Shared state and sound effects for missile launches.
//
// Sounds are synthesised with the Web Audio API rather than shipped as
// audio files. Browsers only allow audio after the user has interacted
// with the page, so the AudioContext is created/resumed on the first
// click or keypress; anyone who hasn't touched the page yet sees the
// animation without sound.
@Injectable({
  providedIn: 'root'
})
export class MissileService {
  private audio: AudioContext | null = null;
  // Reaction ids of missiles currently flying. Their 💥 chip is held
  // back until impact so it doesn't spoil the animation.
  private inFlight = new Set<string>();

  constructor() {
    const unlock = () => {
      this.context()?.resume().catch(() => {});
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  }

  startFlight(reactionId: string): void {
    this.inFlight.add(reactionId);
  }

  land(reactionId: string): void {
    this.inFlight.delete(reactionId);
  }

  isInFlight(reactionId: string): boolean {
    return this.inFlight.has(reactionId);
  }

  // Rising, then falling, filtered-noise whoosh (~1.4s, matches the flight).
  playLaunch(): void {
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const noise = this.noiseSource(ctx, 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.9);
    filter.frequency.exponentialRampToValueAtTime(600, now + 1.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.6);
  }

  // Low rumble plus a falling sine thump.
  playBoom(): void {
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const noise = this.noiseSource(ctx, 1.5);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, now);
    lowpass.frequency.exponentialRampToValueAtTime(80, now + 1.2);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    noise.connect(lowpass).connect(noiseGain).connect(ctx.destination);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, now);
    thump.frequency.exponentialRampToValueAtTime(35, now + 0.8);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.9, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 1);
    thump.connect(thumpGain).connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 1.5);
    thump.start(now);
    thump.stop(now + 1);
  }

  private context(): AudioContext | null {
    if (!this.audio) {
      try {
        this.audio = new AudioContext();
      } catch {
        return null;  // no Web Audio support -- stay silent
      }
    }
    return this.audio;
  }

  private noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}

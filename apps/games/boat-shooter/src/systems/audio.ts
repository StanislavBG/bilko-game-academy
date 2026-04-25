/**
 * Audio system — procedural SFX + short musical stings via WebAudio.
 *
 * No asset files needed. Every sound is generated at runtime from
 * oscillators + envelope + low-pass filter. Good enough for P4;
 * real SFX assets can replace these calls in P5+ without touching callers.
 *
 * Respects the shared `masterVolume + sfxVolume` from ctx.settings (read
 * lazily through a getter that the StageScene provides).
 */

import type { ReadonlySettings } from '@bilko/game-sdk';

type ToneShape = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface ToneSpec {
  freq: number;
  durationMs: number;
  shape: ToneShape;
  attackMs?: number;
  releaseMs?: number;
  sweep?: number; // frequency change over duration (Hz)
  volume?: number; // 0..1 before master/sfx scaling
  filterHz?: number;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: ReadonlySettings | null = null;
  private _enabled = true;

  attachSettings(settings: ReadonlySettings): void {
    this.settings = settings;
  }

  /** Lazily create the AudioContext on first sound — browsers require a user gesture. */
  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  enable(): void { this._enabled = true; }
  disable(): void { this._enabled = false; }

  /** Play a single oscillator tone with envelope. */
  tone(spec: ToneSpec): void {
    if (!this._enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const master = this.master;
    const volumeScale = this.effectiveVolume();
    if (volumeScale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = spec.shape;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.sweep) {
      osc.frequency.linearRampToValueAtTime(spec.freq + spec.sweep, now + spec.durationMs / 1000);
    }

    const gain = ctx.createGain();
    const attack = (spec.attackMs ?? 6) / 1000;
    const release = (spec.releaseMs ?? 80) / 1000;
    const dur = spec.durationMs / 1000;
    const peak = (spec.volume ?? 0.4) * volumeScale;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.linearRampToValueAtTime(peak * 0.8, now + dur - release);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    let node: AudioNode = osc;
    if (spec.filterHz !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = spec.filterHz;
      osc.connect(filter);
      node = filter;
    }

    node.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /** Chain of tones played back-to-back, for stings. */
  sequence(tones: ToneSpec[], gapMs = 0): void {
    if (!this._enabled) return;
    let delay = 0;
    for (const t of tones) {
      setTimeout(() => this.tone(t), delay);
      delay += t.durationMs + gapMs;
    }
  }

  private effectiveVolume(): number {
    if (!this.settings) return 1;
    const a = this.settings.audio;
    return (a.masterVolume ?? 1) * (a.sfxVolume ?? 1);
  }

  /* ---------- Named SFX helpers — call sites use these. ---------- */

  sfxCannon(): void {
    this.tone({ freq: 200, durationMs: 120, shape: 'sawtooth', sweep: -120, volume: 0.5, filterHz: 800 });
  }
  sfxMusket(): void {
    this.tone({ freq: 340, durationMs: 60, shape: 'square', sweep: -240, volume: 0.3, filterHz: 900 });
  }
  sfxExplosion(): void {
    this.tone({ freq: 90, durationMs: 250, shape: 'sawtooth', sweep: -60, volume: 0.6, filterHz: 600 });
    this.tone({ freq: 140, durationMs: 200, shape: 'square', sweep: -120, volume: 0.35, filterHz: 900 });
  }
  sfxLightning(): void {
    this.tone({ freq: 1200, durationMs: 80, shape: 'square', sweep: -800, volume: 0.25 });
    this.tone({ freq: 2000, durationMs: 60, shape: 'sawtooth', sweep: -1400, volume: 0.2 });
  }
  sfxFlame(): void {
    this.tone({ freq: 160, durationMs: 150, shape: 'sawtooth', sweep: 0, volume: 0.15, filterHz: 700 });
  }
  sfxHit(): void {
    this.tone({ freq: 500, durationMs: 40, shape: 'square', sweep: -300, volume: 0.22 });
  }
  sfxCrit(): void {
    this.sequence([
      { freq: 660, durationMs: 70, shape: 'square', sweep: 220, volume: 0.3 },
      { freq: 880, durationMs: 80, shape: 'square', sweep: -200, volume: 0.3 },
    ]);
  }
  sfxLevelUp(): void {
    this.sequence([
      { freq: 523, durationMs: 90, shape: 'triangle', volume: 0.32 },
      { freq: 659, durationMs: 90, shape: 'triangle', volume: 0.32 },
      { freq: 784, durationMs: 140, shape: 'triangle', volume: 0.4 },
    ], 20);
  }
  sfxCoin(): void {
    this.tone({ freq: 880, durationMs: 80, shape: 'square', sweep: 220, volume: 0.2 });
  }
  sfxGem(): void {
    this.sequence([
      { freq: 1046, durationMs: 80, shape: 'triangle', volume: 0.3 },
      { freq: 1319, durationMs: 100, shape: 'triangle', volume: 0.3 },
    ], 15);
  }
  sfxBossIntro(): void {
    this.sequence([
      { freq: 82, durationMs: 350, shape: 'sawtooth', volume: 0.5, filterHz: 400 },
      { freq: 110, durationMs: 350, shape: 'sawtooth', volume: 0.5, filterHz: 500 },
    ], 100);
  }
  sfxBossDefeat(): void {
    this.sequence([
      { freq: 440, durationMs: 140, shape: 'triangle', volume: 0.4 },
      { freq: 587, durationMs: 140, shape: 'triangle', volume: 0.4 },
      { freq: 784, durationMs: 140, shape: 'triangle', volume: 0.4 },
      { freq: 1047, durationMs: 350, shape: 'triangle', volume: 0.5 },
    ], 30);
  }
  sfxReaction(): void {
    this.sequence([
      { freq: 880, durationMs: 60, shape: 'square', sweep: 440, volume: 0.3 },
      { freq: 1320, durationMs: 100, shape: 'square', sweep: -400, volume: 0.3 },
    ], 10);
  }
  sfxUiClick(): void {
    this.tone({ freq: 520, durationMs: 50, shape: 'triangle', volume: 0.22 });
  }

  /* ---------- Music: adaptive 3-layer act loops. ----------
   *
   * Every act now produces three concurrent procedural layers which share
   * a single scheduler tick:
   *   - calmGain   — base melody + sparse bass; locked at 1.0 (always audible).
   *   - combatGain — added percussion + brass stab; cross-fades 0..1 with danger.
   *   - bossGain   — choir-pad + crescendo pulse; 1.0 while boss alive, else 0.
   *
   * setDanger(x) smooth-approaches the combat gain target over a 2 s linear
   * ramp so rapid per-frame calls don't churn the audio graph.
   *
   * Time / space: O(1) per tick — a small, fixed set of oscillators spawned
   * per bar and the 3 persistent GainNodes. No per-frame allocations.
   */

  private musicInterval: number | null = null;
  /** Per-layer persistent gains. Null until a music loop is started. */
  private calmGain: GainNode | null = null;
  private combatGain: GainNode | null = null;
  private bossGain: GainNode | null = null;
  /** Gain node the music layers feed into; scaled by musicVolume * masterVolume. */
  private musicOut: GainNode | null = null;
  /** Most recent danger target; used to avoid redundant ramp scheduling. */
  private dangerTarget = 0;
  /** Most recent boss-active state; used by setBossActive guard. */
  private bossActive = false;

  playActMusic(act: 1 | 2 | 3): void {
    this.stopMusic();
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;

    // Build per-layer gain nodes once per call.
    this.musicOut = ctx.createGain();
    this.musicOut.gain.value = this.effectiveMusicVolume();
    this.musicOut.connect(this.master);

    this.calmGain = ctx.createGain();
    this.calmGain.gain.value = 1;
    this.calmGain.connect(this.musicOut);

    this.combatGain = ctx.createGain();
    this.combatGain.gain.value = 0;
    this.combatGain.connect(this.musicOut);

    this.bossGain = ctx.createGain();
    this.bossGain.gain.value = 0;
    this.bossGain.connect(this.musicOut);

    this.dangerTarget = 0;
    this.bossActive = false;

    // Per-act melody + bass note sequence.
    const notes: Record<1 | 2 | 3, number[]> = {
      1: [220, 246, 293, 220, 246, 329, 293, 246],
      2: [164, 196, 246, 293, 246, 196, 164, 174],
      3: [146, 174, 220, 293, 349, 293, 261, 220],
    };
    const tempo = 400;
    let idx = 0;
    const tracks = notes[act];

    const tick = (): void => {
      // Keep musicOut in sync with live volume settings.
      if (this.musicOut) {
        this.musicOut.gain.value = this.effectiveMusicVolume();
      }
      const freq = tracks[idx % tracks.length] ?? 220;
      this.playCalmLayer(freq, tempo);
      // Combat-layer notes are scheduled on every tick at full layer gain;
      // the cross-fade happens through combatGain (not per-tone volume).
      this.playCombatLayer(freq, tempo, idx);
      this.playBossLayer(freq, tempo, idx);
      idx += 1;
    };
    tick();
    this.musicInterval = window.setInterval(tick, tempo);
  }

  /** Calm layer — triangle melody + sine sub-bass; always audible. */
  private playCalmLayer(freq: number, tempo: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.calmGain) return;
    this.spawnLayerTone(this.calmGain, {
      freq,
      durationMs: tempo * 0.9,
      shape: 'triangle',
      volume: 0.25,
      filterHz: 1200,
    });
    this.spawnLayerTone(this.calmGain, {
      freq: freq / 2,
      durationMs: tempo * 0.9,
      shape: 'sine',
      volume: 0.18,
    });
  }

  /** Combat layer — brass stab (saw + lowpass) + off-beat drum hit. */
  private playCombatLayer(freq: number, tempo: number, idx: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.combatGain) return;
    // Brass stab on every other beat, at the melody fifth.
    if (idx % 2 === 0) {
      this.spawnLayerTone(this.combatGain, {
        freq: freq * 1.5,
        durationMs: tempo * 0.6,
        shape: 'sawtooth',
        volume: 0.22,
        filterHz: 900,
        attackMs: 12,
        releaseMs: 60,
      });
    }
    // Drum kick — very short lowpass saw sweep.
    this.spawnLayerTone(this.combatGain, {
      freq: 110,
      durationMs: 90,
      shape: 'square',
      volume: 0.28,
      filterHz: 300,
      attackMs: 2,
      releaseMs: 40,
      sweep: -60,
    });
  }

  /** Boss layer — detuned triangle choir pad + crescendo pulse. */
  private playBossLayer(freq: number, tempo: number, idx: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bossGain) return;
    // Choir pad — 3 detuned triangles stacked for chorus thickness.
    const pad = freq / 2;
    for (const detune of [-6, 0, 6]) {
      this.spawnLayerTone(this.bossGain, {
        freq: pad * (1 + detune / 1200),
        durationMs: tempo * 1.6,
        shape: 'triangle',
        volume: 0.1,
        filterHz: 1400,
        attackMs: 80,
        releaseMs: 200,
      });
    }
    // Crescendo pulse — low saw every 4 beats.
    if (idx % 4 === 0) {
      this.spawnLayerTone(this.bossGain, {
        freq: 55,
        durationMs: tempo * 3,
        shape: 'sawtooth',
        volume: 0.18,
        filterHz: 500,
        attackMs: 200,
        releaseMs: 400,
      });
    }
  }

  /**
   * Spawn a one-shot oscillator feeding the given layer gain. Uses the
   * same envelope shape as tone() but ignores the global SFX volume —
   * per-layer gain handles the mix.
   */
  private spawnLayerTone(layer: GainNode, spec: ToneSpec): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = spec.shape;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.sweep) {
      osc.frequency.linearRampToValueAtTime(spec.freq + spec.sweep, now + spec.durationMs / 1000);
    }
    const env = ctx.createGain();
    const attack = (spec.attackMs ?? 6) / 1000;
    const release = (spec.releaseMs ?? 80) / 1000;
    const dur = spec.durationMs / 1000;
    const peak = spec.volume ?? 0.4;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(peak, now + attack);
    env.gain.linearRampToValueAtTime(peak * 0.8, now + Math.max(attack, dur - release));
    env.gain.linearRampToValueAtTime(0, now + dur);

    let node: AudioNode = osc;
    if (spec.filterHz !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = spec.filterHz;
      osc.connect(filter);
      node = filter;
    }
    node.connect(env);
    env.connect(layer);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /**
   * Cross-fade the combat layer toward `x` (0..1). Clamped, linear 2 s ramp.
   * Calling this every frame is safe — we skip rescheduling when the target
   * hasn't changed meaningfully (< 0.01 delta).
   */
  setDanger(x: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.combatGain) return;
    const target = Math.max(0, Math.min(1, x));
    if (Math.abs(target - this.dangerTarget) < 0.01) return;
    this.dangerTarget = target;
    const now = ctx.currentTime;
    // cancelScheduledValues + setValueAtTime(current) anchors the ramp to
    // wherever the gain currently sits — prevents mid-ramp jumps.
    const g = this.combatGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + 2);
  }

  /**
   * Toggle the boss layer. On → 0.8 s ramp up to 1; off → 1 s ramp to 0.
   * Idempotent — repeat calls with the same state are no-ops.
   */
  setBossActive(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.bossGain) return;
    if (on === this.bossActive) return;
    this.bossActive = on;
    const now = ctx.currentTime;
    const g = this.bossGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(on ? 1 : 0, now + (on ? 0.8 : 1));
  }

  /** musicVolume * masterVolume, clamped to [0, 1]. */
  private effectiveMusicVolume(): number {
    if (!this.settings) return 0.7;
    const a = this.settings.audio;
    const v = (a.musicVolume ?? 0.7) * (a.masterVolume ?? 1);
    return Math.max(0, Math.min(1, v));
  }

  stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    // Tear down layer gains so the next playActMusic starts clean.
    this.calmGain?.disconnect();
    this.combatGain?.disconnect();
    this.bossGain?.disconnect();
    this.musicOut?.disconnect();
    this.calmGain = null;
    this.combatGain = null;
    this.bossGain = null;
    this.musicOut = null;
    this.dangerTarget = 0;
    this.bossActive = false;
  }
}

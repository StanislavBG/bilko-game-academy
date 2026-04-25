import Phaser from 'phaser';
import { RunState } from '../run-state';
import { allWeapons } from '../weapons/weapon-catalog';
import { allPassives } from '../weapons/passive-catalog';

type PickKind = 'weapon' | 'passive' | 'heal' | 'stat';

interface Pick {
  kind: PickKind;
  id: string;
  label: string;
  detail: string;
  apply: (state: RunState) => void;
}

/**
 * Pause overlay shown when the player levels up. Offers 3 picks drawn
 * from: available weapons (can level), available passives (can level),
 * a small stat boost, and a heal. Resumes the stage on selection.
 */
export class LevelUpScene extends Phaser.Scene {
  static readonly KEY = 'LevelUpScene';

  private runState!: RunState;
  private stageKey!: string;

  constructor() {
    super({ key: LevelUpScene.KEY });
  }

  init(data: { runState: RunState; stageKey: string }): void {
    this.runState = data.runState;
    this.stageKey = data.stageKey;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.fadeIn(220, 0, 0, 0);

    // Darken underlying scene.
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0);

    // Title.
    const title = this.add.text(W / 2, H * 0.2, 'LEVEL UP', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '72px',
      color: '#e0b063',
    });
    title.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(W / 2, H * 0.2 + 60, `Level ${this.runState.level}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      color: '#cce4ea',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Generate 3 picks.
    const picks = this.generatePicks(3);

    const cardW = 420;
    const cardH = 260;
    const gap = 40;
    const totalW = picks.length * cardW + (picks.length - 1) * gap;
    const startX = (W - totalW) / 2;

    picks.forEach((pick, i) => {
      const x = startX + i * (cardW + gap);
      const y = H * 0.45;
      this.renderCard(x, y, cardW, cardH, pick);
    });
  }

  private renderCard(x: number, y: number, w: number, h: number, pick: Pick): void {
    const card = this.add.rectangle(x, y, w, h, 0x0a4052).setOrigin(0, 0);
    card.setStrokeStyle(3, 0xc79448);

    this.add.text(x + 20, y + 20, pick.label, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '32px',
      color: '#e0b063',
      wordWrap: { width: w - 40 },
    });

    this.add.text(x + 20, y + 70, pick.detail, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#cce4ea',
      wordWrap: { width: w - 40 },
    });

    const kindColor: Record<PickKind, string> = {
      weapon: '#c79448',
      passive: '#3393ac',
      heal: '#6aa84f',
      stat: '#99c9d6',
    };
    this.add.text(x + 20, y + h - 40, pick.kind.toUpperCase(), {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: kindColor[pick.kind],
    });

    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setStrokeStyle(4, 0xe0b063));
    card.on('pointerout', () => card.setStrokeStyle(3, 0xc79448));
    card.on('pointerdown', () => {
      pick.apply(this.runState);
      this.scene.stop();
      this.scene.resume(this.stageKey);
    });
  }

  private generatePicks(n: number): Pick[] {
    const options: Pick[] = [];

    // Weapons the player doesn't have (new) or can still level.
    for (const w of allWeapons()) {
      const held = this.runState.weaponLevel(w.id);
      if (held === 0 && this.runState.weapons.length < 6) {
        options.push({
          kind: 'weapon',
          id: w.id,
          label: w.displayName,
          detail: `NEW · ${w.taglineShort}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      } else if (held >= 1 && held < 5) {
        options.push({
          kind: 'weapon',
          id: w.id,
          label: w.displayName,
          detail: `LEVEL ${held + 1} · ${w.taglineShort}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      }
    }

    // Passives — same logic.
    for (const p of allPassives()) {
      const held = this.runState.passiveLevel(p.id);
      if (held === 0 && this.runState.passives.length < 6) {
        options.push({
          kind: 'passive',
          id: p.id,
          label: p.displayName,
          detail: `NEW · ${p.taglineShort}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      } else if (held >= 1 && held < 5) {
        options.push({
          kind: 'passive',
          id: p.id,
          label: p.displayName,
          detail: `LEVEL ${held + 1} · ${p.taglineShort}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      }
    }

    // Always include a heal option (if damaged).
    options.push({
      kind: 'heal',
      id: 'heal-3',
      label: 'Repair Kit',
      detail: '+3 HP (capped at max)',
      apply: (s) => s.heal(3),
    });

    // Small stat boost.
    options.push({
      kind: 'stat',
      id: 'stat-damage',
      label: 'Sharpened Steel',
      detail: '+1 base damage on all projectiles',
      apply: (s) => {
        s.baseDamage += 1;
      },
    });

    // Shuffle and take n.
    Phaser.Utils.Array.Shuffle(options);
    return options.slice(0, n);
  }
}

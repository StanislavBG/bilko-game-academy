import type { StageScene } from '../../scenes/stage-scene';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../constants';

/**
 * Short boss-intro cinematic — 2s camera shake + name banner + black bars
 * sliding in. Non-blocking; combat continues underneath (the boss just drifts
 * into position during the intro).
 */
export function playBossIntro(scene: StageScene, name: string, subtitle?: string): void {
  // Black cinematic bars.
  const top = scene.add.rectangle(WORLD_WIDTH / 2, -60, WORLD_WIDTH, 120, 0x000000, 0.9);
  const bottom = scene.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT + 60, WORLD_WIDTH, 120, 0x000000, 0.9);
  top.setDepth(1500);
  bottom.setDepth(1500);

  scene.tweens.add({
    targets: top,
    y: 60,
    duration: 300,
    ease: 'Cubic.Out',
  });
  scene.tweens.add({
    targets: bottom,
    y: WORLD_HEIGHT - 60,
    duration: 300,
    ease: 'Cubic.Out',
  });

  // Name banner.
  const banner = scene.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, name, {
    fontFamily: 'Palatino, Georgia, serif',
    fontSize: '96px',
    color: '#e0b063',
    stroke: '#000',
    strokeThickness: 6,
  });
  banner.setOrigin(0.5, 0.5);
  banner.setScale(0.6);
  banner.setAlpha(0);
  banner.setDepth(1600);

  const sub = subtitle
    ? scene.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 70, subtitle, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '32px',
        color: '#cce4ea',
      })
    : null;
  sub?.setOrigin(0.5, 0.5);
  sub?.setAlpha(0);
  sub?.setDepth(1600);

  scene.tweens.add({
    targets: banner,
    alpha: 1,
    scale: 1,
    duration: 500,
    ease: 'Back.Out',
  });
  if (sub) {
    scene.tweens.add({ targets: sub, alpha: 1, duration: 600, delay: 200 });
  }

  // Camera shake for emphasis.
  scene.cameras.main.shake(400, 0.008);

  // Audio sting.
  scene.audio.sfxBossIntro();

  // Fade out after 2s.
  scene.time.delayedCall(2000, () => {
    scene.tweens.add({
      targets: [banner, ...(sub ? [sub] : [])],
      alpha: 0,
      duration: 400,
      onComplete: () => {
        banner.destroy();
        sub?.destroy();
      },
    });
    scene.tweens.add({
      targets: top,
      y: -60,
      duration: 400,
      ease: 'Cubic.In',
      onComplete: () => top.destroy(),
    });
    scene.tweens.add({
      targets: bottom,
      y: WORLD_HEIGHT + 60,
      duration: 400,
      ease: 'Cubic.In',
      onComplete: () => bottom.destroy(),
    });
  });
}

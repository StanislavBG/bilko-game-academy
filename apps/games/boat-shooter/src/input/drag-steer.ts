import Phaser from 'phaser';

/**
 * Drag-to-steer input, primary iPad scheme.
 *
 * Semantics: the boat steers toward wherever the finger is currently pressed.
 * On pointer-up, target becomes null and the boat coasts to a stop under drag.
 * Keyboard (WASD / arrows) is also supported as a fallback for PC — it adds a
 * direction vector that is combined with touch target.
 */
export interface DragSteerTarget {
  x: number | null;
  y: number | null;
  keyboardVec: { x: number; y: number };
  touching: boolean;
  /** Set by Ghost Commodore possession: inverts effective steer direction. */
  inverted: boolean;
}

export class DragSteer {
  readonly target: DragSteerTarget = {
    x: null,
    y: null,
    keyboardVec: { x: 0, y: 0 },
    touching: false,
    inverted: false,
  };

  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  } | null = null;

  constructor(private scene: Phaser.Scene) {
    const input = scene.input;

    input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointer, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointer, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);

    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = {
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    this.target.x = pointer.worldX;
    this.target.y = pointer.worldY;
    this.target.touching = true;
  }

  private handlePointerUp(): void {
    this.target.x = null;
    this.target.y = null;
    this.target.touching = false;
  }

  update(): void {
    if (!this.keys) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) dx -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) dx += 1;
    if (this.keys.up.isDown || this.keys.w.isDown) dy -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown) dy += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.target.keyboardVec.x = dx / len;
      this.target.keyboardVec.y = dy / len;
    } else {
      this.target.keyboardVec.x = 0;
      this.target.keyboardVec.y = 0;
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointer, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointer, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }
}

# Controls

## Primary scheme (iPad, touch)

- **Drag-to-steer** anywhere on screen. The boat moves toward the drag
  point with inertia (accel + max speed from player stats).
- **Auto-fire** for primary cannons. Always on unless Hold-to-Fire is
  enabled in Settings.
- **Special weapon** — on-screen button (bottom-right).
- **Boost / dash** — double-tap a direction (or dedicated button in
  one-handed mode). Unlocked at Engine meta L10.
- **Pause** — swipe down from the top.

## PC (keyboard + mouse)

| Action | Default |
|--------|---------|
| Steer | W A S D or arrows |
| Fire | auto (or Space if Hold-to-Fire) |
| Special | Shift |
| Boost | Shift + direction |
| Pause | Esc |
| Mouse aim | Optional — overrides auto-targeting for aim-capable weapons |

## Gamepad

| Action | Button |
|--------|--------|
| Steer | Left stick |
| Fire | Auto (or A if Hold-to-Fire) |
| Special | RT |
| Boost | LT |
| Pause | Start |

## Remapping

Every action is rebindable via Settings → Controls (see platform doc
`05-shared-settings-and-controls.md`). Rebinds apply live.

## One-handed mode

All on-screen controls mirror to one side (left or right). Drag region
restricted to that half. Useful on iPad for accessibility.

## Default targeting rules (per weapon)

| Weapon archetype | Targeting |
|------------------|-----------|
| Direct projectile (Bow Cannon) | auto-forward |
| Broadside | both flanks simultaneously, fixed direction |
| Harpoon | auto-nearest |
| Chain Lightning | auto-nearest + chain |
| Flamethrower | auto-forward cone |
| Lighthouse Beam | rotating 360° |
| Mortar | auto-random on screen |
| Fire-Arrow Rain | zone 80 px ahead of boat |
| Kraken-Ink Cloud | trails boat (aura) |
| Spinning Axes | orbit |
| Homing Musket Swarm | each ball auto-nearest |
| Stern Mines | drop behind, homing within 150 px |
| Ghost-Crew Volley | each ghost auto-nearest |

See `04-weapons.md` for full specs.

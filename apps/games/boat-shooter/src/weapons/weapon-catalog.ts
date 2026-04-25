import type { WeaponDefinition } from './weapon';
import { BowCannonVolley } from './bow-cannon';
import { BroadsideShot } from './broadside';
import { Harpoon } from './harpoon';
import { ChainLightning } from './chain-lightning';
import { Flamethrower } from './flamethrower';
import { LighthouseBeam } from './lighthouse-beam';
import { Mortar } from './mortar';
import { FireArrowRain } from './fire-arrow-rain';
import { KrakenInkCloud } from './kraken-ink-cloud';
import { SpinningAxes } from './spinning-axes';
import { HomingMusketSwarm } from './homing-musket-swarm';
import { SternMines } from './stern-mines';
import { GhostCrewVolley } from './ghost-crew-volley';

/**
 * Registry of weapon definitions. Adding a new weapon = adding it here and
 * implementing its class. P3+ will externalize this to JSON for balance
 * tuning, but code-registered is fine at this scale.
 */
export const WEAPON_DEFS: Record<string, WeaponDefinition> = {
  'bow-cannon': {
    id: 'bow-cannon',
    displayName: 'Bow Cannon Volley',
    taglineShort: 'Reliable workhorse. Forward volley.',
    create: (scene) => new BowCannonVolley(scene),
  },
  'broadside': {
    id: 'broadside',
    displayName: 'Broadside Shot',
    taglineShort: 'Rhythmic BOOM-BOOM salvo from both flanks.',
    create: (scene) => new BroadsideShot(scene),
  },
  'harpoon': {
    id: 'harpoon',
    displayName: 'Harpoon',
    taglineShort: 'Slow thunk, massive pierce.',
    create: (scene) => new Harpoon(scene),
  },
  'chain-lightning': {
    id: 'chain-lightning',
    displayName: 'Chain Lightning',
    taglineShort: 'Zap-zap-zap — chains between clustered enemies.',
    create: (scene) => new ChainLightning(scene),
  },
  'flamethrower': {
    id: 'flamethrower',
    displayName: 'Flamethrower',
    taglineShort: 'Forward cone; melts and burns.',
    create: (scene) => new Flamethrower(scene),
  },
  'lighthouse-beam': {
    id: 'lighthouse-beam',
    displayName: 'Lighthouse Beam',
    taglineShort: 'Rotating beam sweeps 360°.',
    create: (scene) => new LighthouseBeam(scene),
  },
  'mortar': {
    id: 'mortar',
    displayName: 'Mortar',
    taglineShort: 'Arc ballistic; big splash.',
    create: (scene) => new Mortar(scene),
  },
  'fire-arrow-rain': {
    id: 'fire-arrow-rain',
    displayName: 'Fire-Arrow Rain',
    taglineShort: 'Zone shower ahead; burns + patch.',
    create: (scene) => new FireArrowRain(scene),
  },
  'kraken-ink': {
    id: 'kraken-ink',
    displayName: 'Kraken-Ink Cloud',
    taglineShort: 'Aura trails behind; slows + poisons.',
    create: (scene) => new KrakenInkCloud(scene),
  },
  'spinning-axes': {
    id: 'spinning-axes',
    displayName: 'Spinning Boarding-Axes',
    taglineShort: 'Orbit melee shield.',
    create: (scene) => new SpinningAxes(scene),
  },
  'homing-musket': {
    id: 'homing-musket',
    displayName: 'Homing Musket Swarm',
    taglineShort: 'Burst of seeking shots.',
    create: (scene) => new HomingMusketSwarm(scene),
  },
  'stern-mines': {
    id: 'stern-mines',
    displayName: 'Stern Mines',
    taglineShort: 'Drop-behind explosive trap.',
    create: (scene) => new SternMines(scene),
  },
  'ghost-crew': {
    id: 'ghost-crew',
    displayName: 'Ghost-Crew Volley',
    taglineShort: 'Spectral crew appears, volleys, vanishes.',
    create: (scene) => new GhostCrewVolley(scene),
  },
};

export function allWeapons(): WeaponDefinition[] {
  return Object.values(WEAPON_DEFS);
}

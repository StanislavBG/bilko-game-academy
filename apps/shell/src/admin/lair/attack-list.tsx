import { useState } from 'react';
import type {
  BulletKind,
  EnemyAbilityMap,
  EnemyAttack,
  EnemyId,
} from '@bilko/boat-shooter-schema';
import { ATTACK_KINDS, BULLET_KINDS } from '../garage/constants';

interface Props {
  enemyId: EnemyId;
  abilityMap: EnemyAbilityMap;
  onChange: (next: EnemyAbilityMap) => void;
}

function defaultAttack(kind: EnemyAttack['kind']): EnemyAttack {
  switch (kind) {
    case 'forward-fire':
      return { kind: 'forward-fire', bulletKind: 'cannon', intervalMs: 1500, damage: 1 };
    case 'aim-spread':
      return { kind: 'aim-spread', bulletKind: 'cannon', bullets: 3, spreadDeg: 20, intervalMs: 2000, damage: 1 };
    case 'radial-burst':
      return { kind: 'radial-burst', bulletKind: 'cannon', bullets: 8, intervalMs: 3500, damage: 1 };
    case 'mortar-arc':
      return { kind: 'mortar-arc', bulletKind: 'cannon', intervalMs: 3000, damage: 2, aoeRadius: 60, telegraphMs: 800 };
  }
}

export function AttackList({ enemyId, abilityMap, onChange }: Props): JSX.Element {
  const [picking, setPicking] = useState(false);

  function update(idx: number, next: EnemyAttack): void {
    const attacks = abilityMap.attacks.map((a, i) => (i === idx ? next : a));
    onChange({ ...abilityMap, attacks });
  }

  function remove(idx: number): void {
    const attacks = abilityMap.attacks.filter((_, i) => i !== idx);
    onChange({ ...abilityMap, attacks });
  }

  function add(kind: EnemyAttack['kind']): void {
    const attacks = [...abilityMap.attacks, defaultAttack(kind)];
    onChange({ ...abilityMap, attacks });
    setPicking(false);
  }

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-gold-400">Attacks</h3>
        <code className="text-xs text-sea-400">{enemyId}</code>
      </div>

      {abilityMap.attacks.length === 0 && !picking && (
        <p className="text-xs text-sea-400 italic mb-3">
          No attacks. This enemy will not fire.
        </p>
      )}

      <div className="space-y-3">
        {abilityMap.attacks.map((attack, idx) => (
          <AttackRow
            key={idx}
            attack={attack}
            onChange={(next) => update(idx, next)}
            onRemove={() => remove(idx)}
          />
        ))}
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-sea-300">Pick a kind:</span>
          {ATTACK_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => add(k)}
              className="px-3 py-1 rounded border border-sea-600 text-sea-100 hover:border-gold-500 hover:text-gold-400 text-xs"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="px-2 py-1 rounded border border-sea-700 text-sea-400 hover:text-red-300 text-xs"
          >
            cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-3 px-3 py-1 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400 text-xs uppercase tracking-wider"
        >
          + Add attack
        </button>
      )}
    </section>
  );
}

function AttackRow({
  attack,
  onChange,
  onRemove,
}: {
  attack: EnemyAttack;
  onChange: (next: EnemyAttack) => void;
  onRemove: () => void;
}): JSX.Element {
  function setKind(kind: EnemyAttack['kind']): void {
    if (kind === attack.kind) return;
    const carryDamage = attack.damage;
    const carryInterval = attack.intervalMs;
    const carryBullet = attack.bulletKind;
    switch (kind) {
      case 'forward-fire':
        onChange({ kind, bulletKind: carryBullet, intervalMs: carryInterval, damage: carryDamage });
        return;
      case 'aim-spread':
        onChange({
          kind,
          bulletKind: carryBullet,
          bullets: 3,
          spreadDeg: 20,
          intervalMs: carryInterval,
          damage: carryDamage,
        });
        return;
      case 'radial-burst':
        onChange({
          kind,
          bulletKind: carryBullet,
          bullets: 8,
          intervalMs: carryInterval,
          damage: carryDamage,
        });
        return;
      case 'mortar-arc':
        onChange({
          kind,
          bulletKind: carryBullet,
          intervalMs: carryInterval,
          damage: carryDamage,
          aoeRadius: 60,
          telegraphMs: 800,
        });
        return;
    }
  }

  return (
    <div className="rounded border border-sea-700 bg-sea-950/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={attack.kind}
          onChange={(e) => setKind(e.target.value as EnemyAttack['kind'])}
          className="bg-sea-950 border border-sea-600 rounded px-2 py-1 text-sm text-sea-100"
        >
          {ATTACK_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={attack.bulletKind}
          onChange={(e) =>
            onChange({ ...attack, bulletKind: e.target.value as BulletKind } as EnemyAttack)
          }
          className="bg-sea-950 border border-sea-600 rounded px-2 py-1 text-sm text-sea-100"
        >
          {BULLET_KINDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1 rounded border border-sea-700 text-sea-300 hover:border-red-500 hover:text-red-300 text-xs"
        >
          × Remove
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
        <NumberField
          label="Interval ms"
          step={50}
          value={attack.intervalMs}
          onChange={(v) => onChange({ ...attack, intervalMs: v } as EnemyAttack)}
        />
        <NumberField
          label="Damage"
          step={1}
          value={attack.damage}
          onChange={(v) => onChange({ ...attack, damage: v } as EnemyAttack)}
        />
        {attack.kind === 'aim-spread' && (
          <>
            <NumberField
              label="Bullets"
              step={1}
              value={attack.bullets}
              onChange={(v) => onChange({ ...attack, bullets: v })}
            />
            <NumberField
              label="Spread °"
              step={1}
              value={attack.spreadDeg}
              onChange={(v) => onChange({ ...attack, spreadDeg: v })}
            />
          </>
        )}
        {attack.kind === 'radial-burst' && (
          <NumberField
            label="Bullets"
            step={1}
            value={attack.bullets}
            onChange={(v) => onChange({ ...attack, bullets: v })}
          />
        )}
        {attack.kind === 'mortar-arc' && (
          <>
            <NumberField
              label="AoE radius"
              step={5}
              value={attack.aoeRadius}
              onChange={(v) => onChange({ ...attack, aoeRadius: v })}
            />
            <NumberField
              label="Telegraph ms"
              step={50}
              value={attack.telegraphMs}
              onChange={(v) => onChange({ ...attack, telegraphMs: v })}
            />
          </>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  step,
  value,
  onChange,
}: {
  label: string;
  step: number;
  value: number;
  onChange: (next: number) => void;
}): JSX.Element {
  return (
    <label className="flex items-center gap-2">
      <span className="flex-1 text-sea-200">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? 0 : Number(v));
        }}
        className="w-24 px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 tabular-nums focus:outline-none focus:border-gold-500"
      />
    </label>
  );
}

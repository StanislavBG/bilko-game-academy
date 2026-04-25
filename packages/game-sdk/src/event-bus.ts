export type GameEvent =
  | { type: 'score'; board: string; score: number; durationMs?: number }
  | { type: 'achievement'; id: string }
  | { type: 'stage-clear'; stageId: string; timeMs: number }
  | { type: 'campaign-clear'; difficulty: string; timeMs: number }
  | { type: 'evolution'; weaponId: string; evolutionId: string }
  | { type: 'purchase'; kind: 'coin' | 'gem' | 'cosmetic'; itemId: string; cost: number }
  | { type: 'boss-defeated'; bossId: string; timeMs: number }
  | { type: 'enemy-killed'; enemyId: string };

export interface EventBus<E extends { type: string } = GameEvent> {
  emit(event: E): void;
  on<T extends E['type']>(type: T, listener: (event: Extract<E, { type: T }>) => void): () => void;
}

// Using a generic listener internally lets us avoid unsound casts in `on`.
type AnyListener<E> = (event: E) => void;

export function createEventBus<E extends { type: string } = GameEvent>(): EventBus<E> {
  const listeners = new Map<string, Set<AnyListener<E>>>();

  return {
    emit(event: E): void {
      const bucket = listeners.get(event.type);
      if (!bucket) return;
      for (const listener of bucket) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[event-bus] listener for "${event.type}" threw:`, err);
        }
      }
    },
    on(type, listener) {
      let bucket = listeners.get(type);
      if (!bucket) {
        bucket = new Set();
        listeners.set(type, bucket);
      }
      // The public signature guarantees `listener` only receives events with a
      // matching `type`. Internally we widen to AnyListener<E>; emit() only
      // invokes listeners registered under the matching type, so the widen
      // is sound.
      const wrapped = listener as unknown as AnyListener<E>;
      bucket.add(wrapped);
      return () => {
        bucket.delete(wrapped);
      };
    },
  };
}

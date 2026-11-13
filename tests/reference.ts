import { Game } from '../src/engine/game.ts'

/**
 * Plain minimax over the rules engine, with no pruning. Slow and obviously
 * correct, which is the point: the real solver is checked against it. Values
 * are the adu team's points minus the other team's.
 */
export function referenceValue(game: Game, aduTeam: boolean[], memo = new Map<string, number>()) {
  const table = game.table
  if (table.outcome) {
    const winner = table.outcome.findIndex((points) => points > 0)
    return aduTeam[winner] ? table.outcome[winner] : -table.outcome[winner]
  }
  // Positions repeat only at trick boundaries, so that is where remembering pays off.
  const key =
    table.isLead && table.pendingBonus < 0
      ? `${game.hands.join()}|${table.toMove}|${table.score.join()}|${table.bonus.join()}`
      : null
  if (key !== null) {
    const known = memo.get(key)
    if (known !== undefined) return known
  }
  const maximizing = aduTeam[table.toMove]
  let best = maximizing ? -Infinity : Infinity
  for (const choice of game.legalChoices()) {
    const next = game.clone()
    next.apply(choice)
    const value = referenceValue(next, aduTeam, memo)
    best = maximizing ? Math.max(best, value) : Math.min(best, value)
  }
  if (key !== null) memo.set(key, best)
  return best
}

/** Small deterministic generator so tests are reproducible. */
export function randomSource(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomDeal(random: () => number): number[] {
  const cards = Array.from({ length: 24 }, (_, card) => card)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return [0, 1, 2, 3].map((seat) =>
    cards.slice(seat * 6, seat * 6 + 6).reduce((mask, card) => mask | (1 << card), 0),
  )
}

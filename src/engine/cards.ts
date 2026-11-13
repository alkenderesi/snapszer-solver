// A card is an index 0..23: suit * 6 + rank. Inside a suit, a higher index is a
// stronger card, so hands are 24-bit masks and "higher cards" is a shift.

export const SUIT_COUNT = 4
export const RANK_COUNT = 6
export const CARD_COUNT = SUIT_COUNT * RANK_COUNT
export const PLAYER_COUNT = 4
export const HAND_SIZE = CARD_COUNT / PLAYER_COUNT

export const PIROS = 0
export const ZOLD = 1
export const TOK = 2
export const MAKK = 3

export const IX = 0
export const ALSO = 1
export const FELSO = 2
export const KIRALY = 3
export const X = 4
export const ASZ = 5

export const RANK_VALUES = [0, 2, 3, 4, 10, 11]
export const TOTAL_POINTS = 120

export const FULL_DECK = (1 << CARD_COUNT) - 1
export const SUIT_MASKS = [0x3f, 0x3f << 6, 0x3f << 12, 0x3f << 18]

export const CARD_VALUES = Int32Array.from({ length: CARD_COUNT }, (_, c) => RANK_VALUES[c % 6])

export const cardOf = (suit: number, rank: number): number => suit * RANK_COUNT + rank
export const suitOf = (card: number): number => (card / RANK_COUNT) | 0
export const rankOf = (card: number): number => card % RANK_COUNT
export const bit = (card: number): number => 1 << card

export function popcount(mask: number): number {
  mask = mask - ((mask >>> 1) & 0x55555555)
  mask = (mask & 0x33333333) + ((mask >>> 2) & 0x33333333)
  return (((mask + (mask >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/** Index of the lowest set bit. The mask must not be zero. */
export const lowestCard = (mask: number): number => 31 - Math.clz32(mask & -mask)

export function cardsOf(mask: number): number[] {
  const cards: number[] = []
  while (mask !== 0) {
    const low = mask & -mask
    cards.push(31 - Math.clz32(low))
    mask ^= low
  }
  return cards
}

export function maskOf(cards: Iterable<number>): number {
  let mask = 0
  for (const card of cards) mask |= 1 << card
  return mask
}

export function pointsOf(mask: number): number {
  let points = 0
  while (mask !== 0) {
    const low = mask & -mask
    points += CARD_VALUES[31 - Math.clz32(low)]
    mask ^= low
  }
  return points
}

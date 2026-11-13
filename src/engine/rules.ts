import { FELSO, KIRALY, RANK_COUNT, SUIT_COUNT, SUIT_MASKS, suitOf } from './cards.ts'

// A choice is a card played plain (0..23) or played after announcing 20/40
// with it (24..47).
export const BONUS_OFFSET = 24
export const isBonus = (choice: number): boolean => choice >= BONUS_OFFSET
export const choiceCard = (choice: number): number =>
  choice >= BONUS_OFFSET ? choice - BONUS_OFFSET : choice
export const bonusChoice = (card: number): number => card + BONUS_OFFSET

export function beats(card: number, other: number, trump: number): boolean {
  const suit = suitOf(card)
  const otherSuit = suitOf(other)
  return (suit === otherSuit && card > other) || (suit === trump && otherSuit !== trump)
}

/** Cards of `suit` in `hand` that are stronger than `card` (which is of that suit). */
const higherInSuit = (hand: number, card: number, suit: number): number =>
  hand & SUIT_MASKS[suit] & ~((2 << card) - 1)

/**
 * The cards a player may play when following: follow the lead suit and beat the
 * winning card if possible; without the lead suit play a trump, beating if
 * possible; otherwise anything.
 */
export function followMask(hand: number, leadSuit: number, trump: number, winning: number): number {
  const inSuit = hand & SUIT_MASKS[leadSuit]
  if (inSuit !== 0) {
    if (suitOf(winning) !== leadSuit) return inSuit
    return higherInSuit(hand, winning, leadSuit) || inSuit
  }
  const trumps = hand & SUIT_MASKS[trump]
  if (trumps !== 0) {
    if (suitOf(winning) !== trump) return trumps
    return higherInSuit(hand, winning, trump) || trumps
  }
  return hand
}

/**
 * What a follower reveals by playing `card`: the cards they cannot be holding,
 * given the rules in `followMask`.
 */
export function excludedByFollow(
  card: number,
  leadSuit: number,
  trump: number,
  winning: number,
): number {
  const suit = suitOf(card)
  const winningSuit = suitOf(winning)
  const all = -1
  if (suit === leadSuit) {
    if (winningSuit !== leadSuit || card > winning) return 0
    return higherInSuit(all, winning, leadSuit)
  }
  let excluded = SUIT_MASKS[leadSuit]
  if (suit === trump) {
    if (winningSuit === trump && card < winning) excluded |= higherInSuit(all, winning, trump)
  } else {
    excluded |= SUIT_MASKS[trump]
  }
  return excluded
}

/** The Felső and Király of every suit in which the hand holds both. */
export function bonusMask(hand: number): number {
  let mask = 0
  for (let suit = 0; suit < SUIT_COUNT; suit++) {
    const pair = (1 << (suit * RANK_COUNT + FELSO)) | (1 << (suit * RANK_COUNT + KIRALY))
    if ((hand & pair) === pair) mask |= pair
  }
  return mask
}

/** The other card of the Felső + Király pair. */
export const bonusPartner = (card: number): number =>
  card % RANK_COUNT === FELSO ? card + 1 : card - 1

export const bonusScore = (card: number, trump: number): number =>
  suitOf(card) === trump ? 40 : 20

/** Announcements only count once the team has taken trick points. */
export const teamScore = (trickPoints: number, bonusPoints: number): number =>
  trickPoints > 0 ? trickPoints + bonusPoints : 0

export const WINNING_SCORE = 66

export const outcomePoints = (opponentScore: number): number =>
  opponentScore === 0 ? 3 : opponentScore < 33 ? 2 : 1

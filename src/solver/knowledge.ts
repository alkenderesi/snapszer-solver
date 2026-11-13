import { CARD_COUNT, FULL_DECK, HAND_SIZE, PLAYER_COUNT, suitOf } from '../engine/cards.ts'
import { bonusPartner, choiceCard, excludedByFollow, isBonus } from '../engine/rules.ts'
import type { Table } from '../engine/table.ts'

const EVERYONE = (1 << PLAYER_COUNT) - 1

/**
 * What one player can know about where the unplayed cards are. For every card
 * it keeps the set of seats that might still hold it, and for every seat how
 * many cards it holds. A deal is consistent when each card
 * sits with one of its possible seats and every seat has the right count.
 *
 * The follow rules are strict, so every observation is either "this seat does
 * not hold these cards" or "this seat holds this card", and this structure
 * describes the consistent deals exactly.
 */
export class Knowledge {
  /** Per card, a bitmask of the seats that may hold it. */
  readonly possible: Uint8Array
  readonly handSize: number[]
  /** Mask of the cards still in a hand. One with no possible seat makes the knowledge contradictory. */
  unplayed: number

  constructor(possible?: Uint8Array, handSize?: number[], unplayed = FULL_DECK) {
    this.possible = possible ?? new Uint8Array(CARD_COUNT).fill(EVERYONE)
    this.handSize = handSize ?? new Array<number>(PLAYER_COUNT).fill(HAND_SIZE)
    this.unplayed = unplayed
  }

  clone(): Knowledge {
    return new Knowledge(this.possible.slice(), [...this.handSize], this.unplayed)
  }

  /** `seat` is known to hold `card`. */
  hold(seat: number, card: number): void {
    this.possible[card] &= 1 << seat
  }

  /** `seat` holds none of the cards in `mask`. */
  exclude(seat: number, mask: number): void {
    for (let card = 0; card < CARD_COUNT; card++) {
      if (mask & (1 << card)) this.possible[card] &= ~(1 << seat)
    }
  }

  /** `seat`'s whole hand is known: it holds nothing beyond the cards already pinned to it. */
  closeHand(seat: number): void {
    for (let card = 0; card < CARD_COUNT; card++) {
      if (this.possible[card] !== 1 << seat) this.possible[card] &= ~(1 << seat)
    }
  }

  /** Cards known to be in `seat`'s hand. */
  heldBy(seat: number): number {
    let mask = 0
    for (let card = 0; card < CARD_COUNT; card++) {
      if (this.possible[card] === 1 << seat) mask |= 1 << card
    }
    return mask
  }

  /** Cards `seat` might hold. */
  possibleFor(seat: number): number {
    let mask = 0
    for (let card = 0; card < CARD_COUNT; card++) {
      if (this.possible[card] & (1 << seat)) mask |= 1 << card
    }
    return mask
  }

  /** Record the choice the seat to move is about to make. Call before `table.apply`. */
  observe(table: Table, choice: number): void {
    const seat = table.toMove
    const card = choiceCard(choice)
    if (isBonus(choice)) {
      this.hold(seat, card)
      this.hold(seat, bonusPartner(card))
      return
    }
    this.hold(seat, card)
    if (!table.isLead) {
      const leadSuit = suitOf(table.trick[0])
      this.exclude(seat, excludedByFollow(card, leadSuit, table.trump, table.winningCard))
    }
    // A card the seat could not have held leaves the knowledge contradictory.
    if (this.possible[card] === 0) return
    this.possible[card] = 0
    this.unplayed &= ~(1 << card)
    this.handSize[seat]--
  }
}

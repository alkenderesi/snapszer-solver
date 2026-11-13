import { CARD_COUNT, PLAYER_COUNT } from '../engine/cards.ts'
import { bonusPartner, choiceCard, isBonus } from '../engine/rules.ts'
import type { Table } from '../engine/table.ts'
import type { Knowledge } from './knowledge.ts'

// Pascal's triangle up to 24 choose k.
const BINOMIAL: Float64Array[] = []
for (let n = 0; n <= CARD_COUNT; n++) {
  const row = new Float64Array(CARD_COUNT + 1)
  row[0] = 1
  for (let k = 1; k <= n; k++) row[k] = BINOMIAL[n - 1][k - 1] + BINOMIAL[n - 1][k]
  BINOMIAL.push(row)
}

/**
 * Every deal consistent with what is known, as a numbered list: `count` deals,
 * and `unrank(i)` produces deal number `i`. Drawing `i` uniformly samples a
 * consistent deal directly; walking all `i` visits each deal exactly once.
 *
 * Cards with the same set of possible seats are interchangeable, so they form a
 * class. A "split" says how many cards of each class go to each seat; the deals
 * of one split are a product of multinomials, which is what makes ranking cheap.
 */
export class DealSpace {
  readonly count: number = 0
  /** Cards per class, and the seats each class may go to. */
  private readonly classCards: number[][] = []
  private readonly classSeats: number[][] = []
  /** Per split: how many cards of class c go to seat s, at [c * 4 + s]. */
  private readonly splits: Int8Array[] = []
  /** Per split: number of arrangements of each class. */
  private readonly splitWays: Float64Array[] = []
  /** Running total of deals up to and including each split. */
  private readonly cumulative: number[] = []
  private readonly pool = new Int32Array(CARD_COUNT)

  constructor(knowledge: Knowledge) {
    const byMask = new Map<number, number[]>()
    for (let card = 0; card < CARD_COUNT; card++) {
      if (!(knowledge.unplayed & (1 << card))) continue
      const mask = knowledge.possible[card]
      // An unplayed card nobody can hold: no deal is consistent.
      if (mask === 0) return
      const cards = byMask.get(mask)
      if (cards) cards.push(card)
      else byMask.set(mask, [card])
    }
    // Most constrained classes first, so impossible splits are cut early.
    const masks = [...byMask.keys()].sort((a, b) => seatsOf(a).length - seatsOf(b).length || a - b)
    for (const mask of masks) {
      this.classCards.push(byMask.get(mask)!)
      this.classSeats.push(seatsOf(mask))
    }
    const classCount = masks.length
    // capacity[c][s]: cards the classes from c onwards could still give seat s.
    const capacity: number[][] = Array.from({ length: classCount + 1 }, () => [0, 0, 0, 0])
    for (let c = classCount - 1; c >= 0; c--) {
      for (let seat = 0; seat < PLAYER_COUNT; seat++) {
        const gives = this.classSeats[c].includes(seat) ? this.classCards[c].length : 0
        capacity[c][seat] = capacity[c + 1][seat] + gives
      }
    }
    const need = [...knowledge.handSize]
    const split = new Int8Array(classCount * PLAYER_COUNT)
    const ways = new Float64Array(classCount)
    let total = 0

    const fillClass = (c: number, weight: number): void => {
      if (c === classCount) {
        if (need.every((n) => n === 0)) {
          total += weight
          this.splits.push(split.slice())
          this.splitWays.push(ways.slice())
          this.cumulative.push(total)
        }
        return
      }
      const seats = this.classSeats[c]
      const fillSeat = (i: number, left: number, classWays: number): void => {
        const seat = seats[i]
        if (i === seats.length - 1) {
          // The last seat takes what is left, if it fits and later classes can cover the rest.
          if (left > need[seat] || need[seat] - left > capacity[c + 1][seat]) return
          split[c * PLAYER_COUNT + seat] = left
          need[seat] -= left
          ways[c] = classWays
          fillClass(c + 1, weight * classWays)
          need[seat] += left
          return
        }
        const most = Math.min(left, need[seat])
        const least = Math.max(0, need[seat] - capacity[c + 1][seat])
        for (let take = least; take <= most; take++) {
          split[c * PLAYER_COUNT + seat] = take
          need[seat] -= take
          fillSeat(i + 1, left - take, classWays * BINOMIAL[left][take])
          need[seat] += take
        }
      }
      fillSeat(0, this.classCards[c].length, 1)
    }
    fillClass(0, 1)
    this.count = total
  }

  /** Writes deal number `index` (0 ≤ index < count) into `hands` as four card masks. */
  unrank(index: number, hands: Int32Array): void {
    // Find the split this index falls into.
    let low = 0
    let high = this.cumulative.length - 1
    while (low < high) {
      const mid = (low + high) >> 1
      if (this.cumulative[mid] > index) high = mid
      else low = mid + 1
    }
    let rest = low === 0 ? index : index - this.cumulative[low - 1]
    const split = this.splits[low]
    const splitWays = this.splitWays[low]
    const pool = this.pool
    hands[0] = hands[1] = hands[2] = hands[3] = 0
    for (let c = 0; c < this.classCards.length; c++) {
      const cards = this.classCards[c]
      const seats = this.classSeats[c]
      const classWays = splitWays[c]
      const quotient = Math.floor(rest / classWays)
      let rank = rest - quotient * classWays
      rest = quotient
      let size = cards.length
      for (let i = 0; i < size; i++) pool[i] = cards[i]
      for (let i = 0; i < seats.length; i++) {
        const seat = seats[i]
        let take = split[c * PLAYER_COUNT + seat]
        const combinations = BINOMIAL[size][take]
        const next = Math.floor(rank / combinations)
        let combination = rank - next * combinations
        rank = next
        // Unrank the combination, taking its cards and compacting the rest of the pool.
        let kept = 0
        let hand = 0
        for (let j = 0; j < size; j++) {
          const withThis = take > 0 ? BINOMIAL[size - j - 1][take - 1] : 0
          if (take > 0 && combination < withThis) {
            hand |= 1 << pool[j]
            take--
          } else {
            combination -= withThis
            pool[kept++] = pool[j]
          }
        }
        hands[seat] |= hand
        size = kept
      }
    }
  }
}

function seatsOf(mask: number): number[] {
  const seats: number[] = []
  for (let seat = 0; seat < PLAYER_COUNT; seat++) if (mask & (1 << seat)) seats.push(seat)
  return seats
}

export const countDeals = (knowledge: Knowledge): number => new DealSpace(knowledge).count

/** Whether the seat to move could make `choice` in at least one consistent deal. */
export function isFeasible(knowledge: Knowledge, table: Table, choice: number): boolean {
  const seat = 1 << table.toMove
  const card = choiceCard(choice)
  if (!(knowledge.possible[card] & seat)) return false
  if (isBonus(choice) && !(knowledge.possible[bonusPartner(card)] & seat)) return false
  const after = knowledge.clone()
  after.observe(table, choice)
  return countDeals(after) > 0
}

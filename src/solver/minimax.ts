import {
  CARD_COUNT,
  CARD_VALUES,
  FELSO,
  KIRALY,
  PLAYER_COUNT,
  SUIT_MASKS,
} from '../engine/cards.ts'
import { choiceCard, isBonus } from '../engine/rules.ts'

/** The public part of a position: the same for every deal sampled at one decision. */
export interface Position {
  starter: number
  adu: number
  /** Who played the adu card, or -1 while it is still in a hand. */
  aduHolder: number
  toMove: number
  /** Cards of the trick in progress and who played them. */
  trick: number[]
  trickSeats: number[]
  /** Trick points and announced points per seat. */
  score: number[]
  bonus: number[]
}

const SUIT = Int32Array.from({ length: CARD_COUNT }, (_, card) => (card / 6) | 0)
const TABLE_BITS = 16
const TABLE_SIZE = 1 << TABLE_BITS
const WIN = 66
// Each entry of `PAIRS` is the Felső + Király of one suit.
const PAIRS = SUIT_MASKS.map((_, suit) => (1 << (suit * 6 + FELSO)) | (1 << (suit * 6 + KIRALY)))

/**
 * Exact solver for one fully known deal. The adu team (the starter and whoever
 * holds the adu card) maximises, the other team minimises; a value is the adu
 * team's points minus the other team's, so one of -3, -2, -1, 1, 2, 3.
 *
 * Alpha-beta with a transposition table at trick boundaries. A boundary is
 * identified by the cards left, the leader, the adu team's trick points and
 * both teams' announced points; the other team's trick points follow from those.
 */
export class Solver {
  /** Search nodes visited since construction, for benchmarks. */
  nodes = 0

  private readonly hands = new Int32Array(PLAYER_COUNT)
  private readonly team = new Int32Array(PLAYER_COUNT)
  private trump = 0
  private aduBit = 0
  private remaining = 0

  private readonly tableKeys = new Int32Array(TABLE_SIZE)
  private readonly tableData = new Int32Array(TABLE_SIZE)
  private generation = 0

  /**
   * Values of each of the mover's `choices` at `position` with the unplayed
   * cards dealt as in `hands`. Writes one value per choice into `values`.
   */
  evaluate(position: Position, hands: ArrayLike<number>, choices: number[], values: Int8Array) {
    const holder = position.aduHolder >= 0 ? position.aduHolder : holderOf(hands, position.adu)
    this.setDeal(hands, position.starter, position.adu, holder)
    let s0 = 0
    let s1 = 0
    let b0 = 0
    let b1 = 0
    for (let seat = 0; seat < PLAYER_COUNT; seat++) {
      if (this.team[seat] === 0) {
        s0 += position.score[seat]
        b0 += position.bonus[seat]
      } else {
        s1 += position.score[seat]
        b1 += position.bonus[seat]
      }
    }
    const trick = position.trick
    let winCard = 0
    let winSeat = 0
    let points = 0
    for (let i = 0; i < trick.length; i++) {
      if (i === 0 || this.beats(trick[i], winCard)) {
        winCard = trick[i]
        winSeat = position.trickSeats[i]
      }
      points += CARD_VALUES[trick[i]]
    }
    const seat = position.toMove
    const leadCard = trick.length > 0 ? trick[0] : 0
    for (let i = 0; i < choices.length; i++) {
      const card = choiceCard(choices[i])
      const announce = isBonus(choices[i])
      // Close in on the exact value with zero-width windows, which prune far
      // more than one wide search: each probe asks "is it at least `guess`?".
      let lower = -3
      let upper = 3
      let guess = 1
      while (lower < upper) {
        const value = announce
          ? this.afterBonus(seat, card, s0, s1, b0, b1, guess - 1, guess)
          : this.afterPlay(
              seat,
              card,
              trick.length,
              leadCard,
              winCard,
              winSeat,
              points,
              s0,
              s1,
              b0,
              b1,
              guess - 1,
              guess,
            )
        if (value >= guess) {
          lower = value
          guess = value + 1
        } else {
          upper = value
          guess = value
        }
      }
      values[i] = lower
    }
  }

  /**
   * Value of the whole deal for each possible adu card, with `starter` leading
   * and playing its best. Writes 24 values into `values`.
   */
  evaluateAdu(hands: ArrayLike<number>, starter: number, values: Int8Array) {
    for (let adu = 0; adu < CARD_COUNT; adu++) {
      this.setDeal(hands, starter, adu, holderOf(hands, adu))
      let lower = -3
      let upper = 3
      let guess = 1
      while (lower < upper) {
        const value = this.lead(starter, 0, 0, 0, 0, guess - 1, guess)
        if (value >= guess) {
          lower = value
          guess = value + 1
        } else {
          upper = value
          guess = value
        }
      }
      values[adu] = lower
    }
  }

  private setDeal(hands: ArrayLike<number>, starter: number, adu: number, aduHolder: number) {
    this.remaining = 0
    for (let seat = 0; seat < PLAYER_COUNT; seat++) {
      this.hands[seat] = hands[seat]
      this.remaining |= hands[seat]
      this.team[seat] = seat === starter || seat === aduHolder ? 0 : 1
    }
    this.trump = SUIT[adu]
    this.aduBit = 1 << adu
    // A new generation invalidates every stored entry without clearing the table.
    this.generation = (this.generation + 1) & 0xffff
    if (this.generation === 0) {
      this.tableData.fill(0)
      this.generation = 1
    }
  }

  private beats(card: number, other: number): boolean {
    return SUIT[card] === SUIT[other] ? card > other : SUIT[card] === this.trump
  }

  private terminal(winner: number, s0: number, s1: number, b0: number, b1: number): number {
    const loser = winner === 0 ? (s1 > 0 ? s1 + b1 : 0) : s0 > 0 ? s0 + b0 : 0
    const points = loser === 0 ? 3 : loser < 33 ? 2 : 1
    return winner === 0 ? points : -points
  }

  /** `seat` leads a new trick. */
  private lead(
    seat: number,
    s0: number,
    s1: number,
    b0: number,
    b1: number,
    alpha: number,
    beta: number,
  ): number {
    // Points already taken cap what the other team can still win: any trick
    // points rule out a 3, and 33 or more rule out a 2.
    const floor = s0 === 0 ? -3 : s0 + b0 < 33 ? -2 : -1
    const ceiling = s1 === 0 ? 3 : s1 + b1 < 33 ? 2 : 1
    if (floor >= beta) return floor
    if (ceiling <= alpha) return ceiling
    if (floor > alpha) alpha = floor
    if (ceiling < beta) beta = ceiling

    const key = this.remaining | (seat << 24) | ((b0 / 20) << 26) | ((b1 / 20) << 29)
    const slot = (Math.imul(key, 0x9e3779b1) ^ Math.imul(s0 + 1, 0x85ebca6b)) >>> (32 - TABLE_BITS)
    const tag = (this.generation << 16) | s0
    let lower = -4
    let upper = 4
    const stored = this.tableData[slot]
    if (this.tableKeys[slot] === key && (stored & 0xffff007f) === tag) {
      lower = ((stored >> 7) & 15) - 4
      upper = ((stored >> 11) & 15) - 4
      if (lower >= beta) return lower
      if (upper <= alpha) return upper
      if (lower === upper) return lower
      if (lower > alpha) alpha = lower
      if (upper < beta) beta = upper
    }
    const alpha0 = alpha
    const beta0 = beta
    const maximizing = this.team[seat] === 0
    const hand = this.hands[seat]
    let best = maximizing ? -4 : 4

    // Announcing never hurts the announcer's team (more points for them, an
    // earlier win at worst), so a card that can be announced is only tried announced.
    let pairs = 0
    for (let suit = 0; suit < 4; suit++)
      if ((hand & PAIRS[suit]) === PAIRS[suit]) pairs |= PAIRS[suit]
    let moves = hand
    let announced = pairs
    while (moves !== 0) {
      let card: number
      let value: number
      if (announced !== 0) {
        card = 31 - Math.clz32(announced)
        announced ^= 1 << card
        moves ^= 1 << card
        value = this.afterBonus(seat, card, s0, s1, b0, b1, alpha, beta)
      } else {
        // Side suits before trumps, strongest first: this ordering prunes best.
        const side = moves & ~SUIT_MASKS[this.trump]
        card = 31 - Math.clz32(side !== 0 ? side : moves)
        moves ^= 1 << card
        value = this.afterPlay(seat, card, 0, 0, 0, 0, 0, s0, s1, b0, b1, alpha, beta)
      }
      if (maximizing) {
        if (value > best) best = value
        if (best > alpha) alpha = best
      } else {
        if (value < best) best = value
        if (best < beta) beta = best
      }
      if (alpha >= beta) break
    }

    if (best <= alpha0) upper = best
    else if (best >= beta0) lower = best
    else lower = upper = best
    this.tableKeys[slot] = key
    this.tableData[slot] = tag | ((lower + 4) << 7) | ((upper + 4) << 11)
    return best
  }

  /** `seat` follows in a trick that already has `count` cards. */
  private follow(
    seat: number,
    count: number,
    leadCard: number,
    winCard: number,
    winSeat: number,
    points: number,
    s0: number,
    s1: number,
    b0: number,
    b1: number,
    alpha: number,
    beta: number,
  ): number {
    const hand = this.hands[seat]
    const leadSuit = SUIT[leadCard]
    const winSuit = SUIT[winCard]
    // Follow suit and beat if possible; otherwise trump and beat if possible; otherwise anything.
    let moves = hand & SUIT_MASKS[leadSuit]
    if (moves !== 0) {
      if (winSuit === leadSuit) moves = moves & ~((2 << winCard) - 1) || moves
    } else {
      moves = hand & SUIT_MASKS[this.trump]
      if (moves === 0) moves = hand
      else if (winSuit === this.trump) moves = moves & ~((2 << winCard) - 1) || moves
    }
    const maximizing = this.team[seat] === 0
    let best = maximizing ? -4 : 4
    // Likely-best card first: feed points to a trick the team is winning, and
    // spend as little as possible on one it is not.
    const generous = this.team[winSeat] === this.team[seat]
    while (moves !== 0) {
      const card = 31 - Math.clz32(generous ? moves : moves & -moves)
      moves ^= 1 << card
      const value = this.afterPlay(
        seat,
        card,
        count,
        leadCard,
        winCard,
        winSeat,
        points,
        s0,
        s1,
        b0,
        b1,
        alpha,
        beta,
      )
      if (maximizing) {
        if (value > best) best = value
        if (best > alpha) alpha = best
      } else {
        if (value < best) best = value
        if (best < beta) beta = best
      }
      if (alpha >= beta) break
    }
    return best
  }

  /** `seat` announces with `card`, which wins on the spot at 66 with the adu out. */
  private afterBonus(
    seat: number,
    card: number,
    s0: number,
    s1: number,
    b0: number,
    b1: number,
    alpha: number,
    beta: number,
  ): number {
    const team = this.team[seat]
    const announced = SUIT[card] === this.trump ? 40 : 20
    if (team === 0) b0 += announced
    else b1 += announced
    const own = team === 0 ? (s0 > 0 ? s0 + b0 : 0) : s1 > 0 ? s1 + b1 : 0
    if (own >= WIN && (this.remaining & this.aduBit) === 0) {
      return this.terminal(team, s0, s1, b0, b1)
    }
    return this.afterPlay(seat, card, 0, 0, 0, 0, 0, s0, s1, b0, b1, alpha, beta)
  }

  /** `seat` plays `card` as card number `count` of the trick. */
  private afterPlay(
    seat: number,
    card: number,
    count: number,
    leadCard: number,
    winCard: number,
    winSeat: number,
    points: number,
    s0: number,
    s1: number,
    b0: number,
    b1: number,
    alpha: number,
    beta: number,
  ): number {
    this.nodes++
    const cardBit = 1 << card
    this.hands[seat] ^= cardBit
    this.remaining ^= cardBit
    if (count === 0) {
      leadCard = card
      winCard = card
      winSeat = seat
    } else if (SUIT[card] === SUIT[winCard] ? card > winCard : SUIT[card] === this.trump) {
      winCard = card
      winSeat = seat
    }
    points += CARD_VALUES[card]
    let value: number
    if (count === 3) {
      const team = this.team[winSeat]
      if (team === 0) s0 += points
      else s1 += points
      const own = team === 0 ? s0 + b0 : s1 + b1
      const over =
        this.hands[winSeat] === 0 ||
        (own >= WIN && (team === 0 ? s0 : s1) > 0 && (this.remaining & this.aduBit) === 0)
      value = over
        ? this.terminal(team, s0, s1, b0, b1)
        : this.lead(winSeat, s0, s1, b0, b1, alpha, beta)
    } else {
      value = this.follow(
        (seat + 1) & 3,
        count + 1,
        leadCard,
        winCard,
        winSeat,
        points,
        s0,
        s1,
        b0,
        b1,
        alpha,
        beta,
      )
    }
    this.hands[seat] ^= cardBit
    this.remaining ^= cardBit
    return value
  }
}

function holderOf(hands: ArrayLike<number>, card: number): number {
  for (let seat = 0; seat < PLAYER_COUNT; seat++) if (hands[seat] & (1 << card)) return seat
  return -1
}

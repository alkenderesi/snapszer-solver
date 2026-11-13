import { CARD_VALUES, HAND_SIZE, PLAYER_COUNT, suitOf } from './cards.ts'
import {
  beats,
  bonusScore,
  choiceCard,
  isBonus,
  outcomePoints,
  teamScore,
  WINNING_SCORE,
} from './rules.ts'

/**
 * Everything about a game that all four players can see: the trick on the
 * table, the points taken, the announcements and whose turn it is. It advances
 * on choices alone and never looks at a hand.
 */
export class Table {
  readonly starter: number
  readonly adu: number
  readonly trump: number

  /** Seat that has to choose next, or -1 once the game is over. */
  toMove: number
  /** Cards of the trick in progress, in play order, and who played them. */
  trick: number[] = []
  trickSeats: number[] = []
  /** The last completed trick, kept so it can stay on the table. */
  lastTrick: number[] = []
  lastTrickSeats: number[] = []
  /** Card that must be played next because it was just announced, or -1. */
  pendingBonus = -1
  /** Mask of every card played so far. */
  played = 0
  score = [0, 0, 0, 0]
  bonus = [0, 0, 0, 0]
  handSize = [HAND_SIZE, HAND_SIZE, HAND_SIZE, HAND_SIZE]
  /** Who played the adu card; -1 while it is still in a hand. */
  aduHolder = -1
  /** Points per seat once the game is over. */
  outcome: number[] | null = null

  constructor(starter: number, adu: number) {
    this.starter = starter
    this.adu = adu
    this.trump = suitOf(adu)
    this.toMove = starter
  }

  clone(): Table {
    const copy = new Table(this.starter, this.adu)
    copy.toMove = this.toMove
    copy.trick = [...this.trick]
    copy.trickSeats = [...this.trickSeats]
    copy.lastTrick = [...this.lastTrick]
    copy.lastTrickSeats = [...this.lastTrickSeats]
    copy.pendingBonus = this.pendingBonus
    copy.played = this.played
    copy.score = [...this.score]
    copy.bonus = [...this.bonus]
    copy.handSize = [...this.handSize]
    copy.aduHolder = this.aduHolder
    copy.outcome = this.outcome ? [...this.outcome] : null
    return copy
  }

  get isOver(): boolean {
    return this.outcome !== null
  }

  get isLead(): boolean {
    return this.trick.length === 0
  }

  /** The card currently winning the trick in progress. */
  get winningCard(): number {
    let winning = this.trick[0]
    for (let i = 1; i < this.trick.length; i++) {
      if (beats(this.trick[i], winning, this.trump)) winning = this.trick[i]
    }
    return winning
  }

  /** Only meaningful once the adu card has been played. */
  onAduTeam(seat: number): boolean {
    return seat === this.starter || seat === this.aduHolder
  }

  private teamScoreOf(aduTeam: boolean): number {
    let trickPoints = 0
    let bonusPoints = 0
    for (let seat = 0; seat < PLAYER_COUNT; seat++) {
      if (this.onAduTeam(seat) === aduTeam) {
        trickPoints += this.score[seat]
        bonusPoints += this.bonus[seat]
      }
    }
    return teamScore(trickPoints, bonusPoints)
  }

  /** Ends the game for `seat`'s team if they are out of cards or have 66 with the adu out. */
  private checkEnd(seat: number): boolean {
    const aduOut = this.aduHolder >= 0
    const aduTeam = this.onAduTeam(seat)
    if (this.handSize[seat] !== 0 && !(aduOut && this.teamScoreOf(aduTeam) >= WINNING_SCORE)) {
      return false
    }
    const points = outcomePoints(this.teamScoreOf(!aduTeam))
    this.outcome = [0, 1, 2, 3].map((s) => (this.onAduTeam(s) === aduTeam ? points : 0))
    this.toMove = -1
    return true
  }

  apply(choice: number): void {
    const seat = this.toMove
    const card = choiceCard(choice)
    if (isBonus(choice)) {
      this.bonus[seat] += bonusScore(card, this.trump)
      if (!this.checkEnd(seat)) this.pendingBonus = card
      return
    }
    if (this.trick.length === 0) {
      this.lastTrick = []
      this.lastTrickSeats = []
    }
    this.pendingBonus = -1
    this.trick.push(card)
    this.trickSeats.push(seat)
    this.played |= 1 << card
    this.handSize[seat]--
    if (card === this.adu) this.aduHolder = seat
    if (this.trick.length < PLAYER_COUNT) {
      this.toMove = (seat + 1) % PLAYER_COUNT
      return
    }
    let winner = 0
    let points = CARD_VALUES[this.trick[0]]
    for (let i = 1; i < PLAYER_COUNT; i++) {
      points += CARD_VALUES[this.trick[i]]
      if (beats(this.trick[i], this.trick[winner], this.trump)) winner = i
    }
    const winnerSeat = this.trickSeats[winner]
    this.score[winnerSeat] += points
    this.lastTrick = this.trick
    this.lastTrickSeats = this.trickSeats
    this.trick = []
    this.trickSeats = []
    if (!this.checkEnd(winnerSeat)) this.toMove = winnerSeat
  }
}

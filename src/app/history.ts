import {
  CARD_COUNT,
  cardsOf,
  FELSO,
  FULL_DECK,
  HAND_SIZE,
  KIRALY,
  PLAYER_COUNT,
  popcount,
  rankOf,
} from '../engine/cards.ts'
import { legalChoices } from '../engine/game.ts'
import { bonusChoice, choiceCard, isBonus } from '../engine/rules.ts'
import { Table } from '../engine/table.ts'
import { isFeasible } from '../solver/deals.ts'
import { ADU_CHOICES, type Job } from '../solver/job.ts'
import { Knowledge } from '../solver/knowledge.ts'

// Seats in turn order. T is the user, at the bottom; play goes counter-clockwise.
export const T = 0
export const B = 1
export const P = 2
export const A = 3

/** One confirmed tap. A game is nothing more than the list of these. */
export type Input =
  | { type: 'starter'; seat: number }
  | { type: 'deal'; card: number }
  | { type: 'adu'; card: number }
  | { type: 'choice'; choice: number }

export type Phase = 'starter' | 'deal' | 'adu' | 'play' | 'over'

/** Everything the screen shows, derived from the inputs so far. */
export interface View {
  phase: Phase
  /** -1 until chosen. */
  starter: number
  adu: number
  /** The seat whose grid is showing, or -1. */
  active: number
  /** Mask of the cards that can be tapped in the grid. */
  enabled: number
  /** Mask of the cards that can also be announced. */
  announceable: number
  /** T's cards: those dealt so far, then those still in hand. */
  hand: number
  /** The cards on the table and who played them. */
  trick: number[]
  trickSeats: number[]
  /** Points per seat once the game is over. */
  outcome: number[] | null
  /** The decision for the solver, whenever it is T's turn to choose. */
  job: Job | null
}

/** Cards T is dealt before choosing the adu as the starting player. */
const FIRST_DEAL = 3

const isIndex = (value: unknown, limit: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < limit

/** Replays the inputs. Throws if they do not describe a possible game. */
export function derive(history: readonly Input[]): View {
  let starter = -1
  let adu = -1
  let hand = 0
  let table: Table | null = null
  let knowledge: Knowledge | null = null

  const phase = (): Phase => {
    if (starter < 0) return 'starter'
    if (table) return table.isOver ? 'over' : 'play'
    if (starter === T && popcount(hand) < FIRST_DEAL) return 'deal'
    return adu < 0 ? 'adu' : 'deal'
  }
  const expect = (ok: boolean) => {
    if (!ok) throw new Error('impossible input')
  }

  for (const input of history) {
    const now = phase()
    if (input.type === 'starter') {
      expect(now === 'starter' && isIndex(input.seat, PLAYER_COUNT))
      starter = input.seat
    } else if (input.type === 'deal') {
      expect(now === 'deal' && isIndex(input.card, CARD_COUNT) && !(hand & (1 << input.card)))
      hand |= 1 << input.card
      if (popcount(hand) === HAND_SIZE) {
        table = new Table(starter, adu)
        knowledge = new Knowledge()
        for (const card of cardsOf(hand)) knowledge.hold(T, card)
        knowledge.closeHand(T)
      }
    } else if (input.type === 'adu') {
      expect(now === 'adu' && isIndex(input.card, CARD_COUNT))
      adu = input.card
    } else {
      expect(now === 'play' && isIndex(input.choice, 2 * CARD_COUNT))
      const card = choiceCard(input.choice)
      if (table!.toMove === T) {
        expect(legalChoices(table!, hand).includes(input.choice))
        if (!isBonus(input.choice)) hand &= ~(1 << card)
      } else {
        expect((knowledge!.possible[card] & (1 << table!.toMove)) !== 0)
      }
      knowledge!.observe(table!, input.choice)
      table!.apply(input.choice)
    }
  }

  const view: View = {
    phase: phase(),
    starter,
    adu,
    active: -1,
    enabled: 0,
    announceable: 0,
    hand,
    trick: [],
    trickSeats: [],
    outcome: null,
    job: null,
  }
  const seed = (history.length + 1) * 0x9e3779b1

  if (view.phase === 'deal') {
    view.active = T
    view.enabled = FULL_DECK & ~hand
  } else if (view.phase === 'adu') {
    view.active = starter
    view.enabled = FULL_DECK
    if (starter === T) {
      // T has seen three of its cards; the other three could be any of the rest.
      const seen = new Knowledge()
      for (const card of cardsOf(hand)) seen.hold(T, card)
      view.job = {
        kind: 'adu',
        possible: seen.possible,
        handSize: seen.handSize,
        unplayed: seen.unplayed,
        position: {
          starter: T,
          adu: 0,
          aduHolder: -1,
          toMove: T,
          trick: [],
          trickSeats: [],
          score: [0, 0, 0, 0],
          bonus: [0, 0, 0, 0],
        },
        choices: ADU_CHOICES,
        seed,
      }
    }
  } else if (table && knowledge) {
    // A finished trick stays on the table until the next card is led.
    const showLast = table.trick.length === 0
    view.trick = showLast ? table.lastTrick : table.trick
    view.trickSeats = showLast ? table.lastTrickSeats : table.trickSeats
    view.outcome = table.outcome
    if (!table.isOver) {
      view.active = table.toMove
      if (table.toMove === T) {
        const choices = legalChoices(table, hand)
        for (const choice of choices) {
          if (isBonus(choice)) view.announceable |= 1 << choiceCard(choice)
          else view.enabled |= 1 << choice
        }
        view.job = {
          kind: 'play',
          possible: knowledge.possible,
          handSize: knowledge.handSize,
          unplayed: knowledge.unplayed,
          position: {
            starter: table.starter,
            adu: table.adu,
            aduHolder: table.aduHolder,
            toMove: T,
            trick: table.trick,
            trickSeats: table.trickSeats,
            score: table.score,
            bonus: table.bonus,
          },
          choices,
          seed,
        }
      } else if (table.pendingBonus >= 0) {
        view.enabled = 1 << table.pendingBonus
      } else {
        // Offer exactly the cards this seat could be playing in some consistent deal.
        for (const card of cardsOf(knowledge.possibleFor(table.toMove) & knowledge.unplayed)) {
          if (isFeasible(knowledge, table, card)) view.enabled |= 1 << card
          const rank = rankOf(card)
          if (table.isLead && (rank === FELSO || rank === KIRALY)) {
            if (isFeasible(knowledge, table, bonusChoice(card))) view.announceable |= 1 << card
          }
        }
      }
    }
  }
  return view
}

/** The input a confirmed tap on `card` makes in the current phase. */
export function inputFor(view: View, card: number, announce: boolean): Input {
  if (view.phase === 'deal') return { type: 'deal', card }
  if (view.phase === 'adu') return { type: 'adu', card }
  return { type: 'choice', choice: announce ? bonusChoice(card) : card }
}

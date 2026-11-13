import { describe, expect, it } from 'vitest'
import { cardsOf, FELSO, KIRALY, popcount, rankOf } from '../src/engine/cards.ts'
import { Game, legalChoices } from '../src/engine/game.ts'
import { choiceCard, isBonus } from '../src/engine/rules.ts'
import type { Table } from '../src/engine/table.ts'
import { countDeals, DealSpace, isFeasible } from '../src/solver/deals.ts'
import { Knowledge } from '../src/solver/knowledge.ts'
import { type Position, Solver } from '../src/solver/minimax.ts'
import games from './fixtures/games.json'
import { randomDeal, randomSource, referenceValue } from './reference.ts'

interface FixtureGame {
  starter: number
  adu: number
  hands: number[]
  decisions: number[][]
}
const fixtures = games as FixtureGame[]
const VIEWER = 0

/** What the viewer knows at the start of play: its own hand and nothing else. */
function initialKnowledge(hand: number): Knowledge {
  const knowledge = new Knowledge()
  for (const card of cardsOf(hand)) knowledge.hold(VIEWER, card)
  knowledge.closeHand(VIEWER)
  return knowledge
}

function positionOf(table: Table): Position {
  return {
    starter: table.starter,
    adu: table.adu,
    aduHolder: table.aduHolder,
    toMove: table.toMove,
    trick: [...table.trick],
    trickSeats: [...table.trickSeats],
    score: [...table.score],
    bonus: [...table.bonus],
  }
}

/** Every way to hand `cards` to seats 1..3 with the given hand sizes. */
function* assignments(cards: number[], sizes: number[], hands = [0, 0, 0, 0]): Generator<number[]> {
  if (cards.length === 0) {
    yield [...hands]
    return
  }
  const [card, ...rest] = cards
  for (let seat = 1; seat < 4; seat++) {
    if (sizes[seat] === 0) continue
    sizes[seat]--
    hands[seat] |= 1 << card
    yield* assignments(rest, sizes, hands)
    hands[seat] &= ~(1 << card)
    sizes[seat]++
  }
}

/** Whether the decisions so far would all have been legal had the unplayed cards been dealt as `current`. */
function historyIsLegal(fixture: FixtureGame, played: number, current: number[]): boolean {
  const original = [...current]
  const replay = new Game(fixture.starter, fixture.adu, fixture.hands)
  for (let i = 0; i < played; i++) {
    const [seat, chosen] = fixture.decisions[i]
    if (!isBonus(chosen)) original[seat] |= 1 << chosen
    replay.apply(chosen)
  }
  const game = new Game(fixture.starter, fixture.adu, original)
  for (let i = 0; i < played; i++) {
    const chosen = fixture.decisions[i][1]
    if (!game.legalChoices().includes(chosen)) return false
    game.apply(chosen)
  }
  return true
}

describe('deal space', () => {
  it('counts the deals a player cannot tell apart', () => {
    expect(countDeals(initialKnowledge(0x3f))).toBe(17153136)
    // Starter with three cards seen: 21 choose 3 for the rest of its hand, then the others.
    const starter = new Knowledge()
    for (const card of [0, 7, 14]) starter.hold(VIEWER, card)
    expect(countDeals(starter)).toBe(22813670880)
  })

  it('numbers every deal exactly once', () => {
    const random = randomSource(1)
    const hands = new Int32Array(4)
    for (let round = 0; round < 40; round++) {
      // A late-game situation: a few cards per seat and some random exclusions.
      const size = 2 + Math.floor(random() * 2)
      const knowledge = new Knowledge()
      const deck = cardsOf(0xffffff).sort(() => random() - 0.5)
      for (const card of deck.slice(4 * size)) knowledge.unplayed &= ~(1 << card)
      for (let seat = 0; seat < 4; seat++) knowledge.handSize[seat] = size
      for (const card of deck.slice(0, size)) knowledge.hold(VIEWER, card)
      knowledge.closeHand(VIEWER)
      for (const card of deck.slice(size, 4 * size)) {
        if (random() < 0.35) knowledge.exclude(1 + Math.floor(random() * 3), 1 << card)
      }
      const space = new DealSpace(knowledge)
      const seen = new Set<string>()
      for (let index = 0; index < space.count; index++) {
        space.unrank(index, hands)
        for (let seat = 0; seat < 4; seat++) {
          expect(popcount(hands[seat])).toBe(size)
          for (const card of cardsOf(hands[seat])) {
            expect(knowledge.possible[card] & (1 << seat)).not.toBe(0)
          }
        }
        seen.add(hands.join())
      }
      expect(seen.size).toBe(space.count)
      const brute = [...assignments(deck.slice(size, 4 * size), [0, size, size, size])].filter(
        (deal) =>
          deal.every((hand, seat) =>
            cardsOf(hand).every((card) => knowledge.possible[card] & (1 << seat)),
          ),
      )
      expect(space.count).toBe(brute.length)
    }
  })
})

describe('knowledge', () => {
  it('always keeps the real deal among the consistent ones', () => {
    for (const fixture of fixtures) {
      const game = new Game(fixture.starter, fixture.adu, fixture.hands)
      const knowledge = initialKnowledge(fixture.hands[VIEWER])
      for (const [seat, chosen] of fixture.decisions) {
        if (seat !== VIEWER) expect(isFeasible(knowledge, game.table, chosen)).toBe(true)
        knowledge.observe(game.table, chosen)
        game.apply(chosen)
        for (let s = 0; s < 4; s++) {
          expect(knowledge.handSize[s]).toBe(popcount(game.hands[s]))
          expect(game.hands[s] & ~knowledge.possibleFor(s)).toBe(0)
        }
      }
    }
  })

  it('describes exactly the deals under which the history was legal', () => {
    const hands = new Int32Array(4)
    let checked = 0
    for (const fixture of fixtures.slice(0, 60)) {
      const game = new Game(fixture.starter, fixture.adu, fixture.hands)
      const knowledge = initialKnowledge(fixture.hands[VIEWER])
      fixture.decisions.forEach(([, chosen], i) => {
        knowledge.observe(game.table, chosen)
        game.apply(chosen)
        const unknown = cardsOf((game.hands[1] | game.hands[2] | game.hands[3]) >>> 0)
        if (game.table.isOver || unknown.length > (game.table.isLead ? 12 : 9)) return
        const sizes = [0, ...game.hands.slice(1).map(popcount)]
        const expected = new Set<string>()
        for (const deal of assignments(unknown, sizes)) {
          deal[VIEWER] = game.hands[VIEWER]
          if (historyIsLegal(fixture, i + 1, deal)) expected.add(deal.join())
        }
        const space = new DealSpace(knowledge)
        const actual = new Set<string>()
        for (let index = 0; index < space.count; index++) {
          space.unrank(index, hands)
          actual.add(hands.join())
        }
        expect(actual).toEqual(expected)
        checked++

        // The cards offered for the next player are exactly those some consistent deal allows.
        const mover = game.table.toMove
        if (mover === VIEWER) return
        const allowed = new Set<number>()
        for (const deal of expected) {
          const hand = Number(deal.split(',')[mover])
          for (const choice of legalChoices(game.table, hand)) allowed.add(choice)
        }
        for (let choice = 0; choice < 48; choice++) {
          // Only a Felső or Király can be announced.
          const rank = rankOf(choiceCard(choice))
          if (isBonus(choice) && rank !== FELSO && rank !== KIRALY) continue
          const possible =
            (!isBonus(choice) || (game.table.isLead && game.table.pendingBonus < 0)) &&
            (game.table.pendingBonus < 0 || choice === game.table.pendingBonus) &&
            isFeasible(knowledge, game.table, choice)
          expect(possible, `choice ${choice}`).toBe(allowed.has(choice))
        }
      })
    }
    expect(checked).toBeGreaterThan(400)
  }, 120_000)
})

describe('minimax', () => {
  const solver = new Solver()

  const expectMatchesReference = (game: Game) => {
    const holder = game.hands.findIndex((hand) => hand & (1 << game.table.adu))
    const aduHolder = game.table.aduHolder >= 0 ? game.table.aduHolder : holder
    const aduTeam = [0, 1, 2, 3].map((seat) => seat === game.table.starter || seat === aduHolder)
    const choices = game.legalChoices()
    const values = new Int8Array(choices.length)
    solver.evaluate(positionOf(game.table), game.hands, choices, values)
    const memo = new Map<string, number>()
    choices.forEach((choice, i) => {
      const next = game.clone()
      next.apply(choice)
      expect(values[i]).toBe(referenceValue(next, aduTeam, memo))
    })
  }

  it('agrees with plain minimax on every choice in the last four tricks', () => {
    let positions = 0
    for (const fixture of fixtures.slice(0, 150)) {
      const game = new Game(fixture.starter, fixture.adu, fixture.hands)
      for (const [, chosen] of fixture.decisions) {
        if (game.hands.reduce((sum, hand) => sum + popcount(hand), 0) <= 16) {
          expectMatchesReference(game)
          positions++
        }
        game.apply(chosen)
      }
    }
    expect(positions).toBeGreaterThan(1000)
  })

  it('agrees with plain minimax on whole deals', () => {
    const random = randomSource(7)
    for (let i = 0; i < 6; i++) {
      const hands = randomDeal(random)
      const game = new Game(Math.floor(random() * 4), Math.floor(random() * 24), hands)
      expectMatchesReference(game)
    }
  }, 120_000)

  it('values every adu card as the deal played out with that adu', () => {
    const random = randomSource(11)
    const hands = randomDeal(random)
    const values = new Int8Array(24)
    solver.evaluateAdu(hands, 2, values)
    for (const adu of [0, 5, 9, 14, 20, 23]) {
      const holder = hands.findIndex((hand) => hand & (1 << adu))
      const aduTeam = [0, 1, 2, 3].map((seat) => seat === 2 || seat === holder)
      expect(values[adu]).toBe(referenceValue(new Game(2, adu, hands), aduTeam))
    }
  }, 120_000)
})

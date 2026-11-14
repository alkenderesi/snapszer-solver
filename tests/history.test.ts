import { describe, expect, it } from 'vitest'
import {
  B,
  derive,
  forcedInput,
  type Input,
  inputFor,
  settle,
  T,
  undo,
} from '../src/app/history.ts'
import { cardsOf, cardOf, FELSO, KIRALY, PIROS } from '../src/engine/cards.ts'
import { bonusChoice, choiceCard, isBonus } from '../src/engine/rules.ts'
import games from './fixtures/games.json'

interface FixtureGame {
  starter: number
  adu: number
  hands: number[]
  decisions: number[][]
  outcome: number[]
}

/** The taps that enter a fixture game, seen from seat 0. */
function setupInputs(fixture: FixtureGame): Input[] {
  const cards = cardsOf(fixture.hands[T])
  const deal = (card: number): Input => ({ type: 'deal', card })
  const adu: Input = { type: 'adu', card: fixture.adu }
  const starter: Input = { type: 'starter', seat: fixture.starter }
  return fixture.starter === T
    ? [starter, ...cards.slice(0, 3).map(deal), adu, ...cards.slice(3).map(deal)]
    : [starter, adu, ...cards.map(deal)]
}

describe('derive', () => {
  it('starts by asking who begins', () => {
    const view = derive([])
    expect(view.phase).toBe('starter')
    expect(view.active).toBe(-1)
    expect(view.job).toBeNull()
  })

  it('walks T through three cards, the adu, then three more when T starts', () => {
    const history: Input[] = [{ type: 'starter', seat: T }]
    expect(derive(history).phase).toBe('deal')
    for (const card of [0, 1, 2]) history.push({ type: 'deal', card })
    let view = derive(history)
    expect(view.phase).toBe('adu')
    expect(view.active).toBe(T)
    expect(view.enabled).toBe(0xffffff)
    expect(view.job?.kind).toBe('adu')
    expect(view.job?.choices.length).toBe(24)
    history.push({ type: 'adu', card: 5 })
    view = derive(history)
    expect(view.phase).toBe('deal')
    expect(view.enabled).toBe(0xffffff & ~0b111)
    for (const card of [3, 4, 5]) history.push({ type: 'deal', card })
    view = derive(history)
    expect(view.phase).toBe('play')
    expect(view.active).toBe(T)
    expect(view.job?.kind).toBe('play')
  })

  it('takes the adu at the starter seat, then six cards, when someone else starts', () => {
    const history: Input[] = [{ type: 'starter', seat: 2 }]
    let view = derive(history)
    expect(view.phase).toBe('adu')
    expect(view.active).toBe(2)
    expect(view.job).toBeNull()
    history.push({ type: 'adu', card: 9 })
    for (const card of [0, 1, 2, 3, 4]) history.push({ type: 'deal', card })
    expect(derive(history).phase).toBe('deal')
    history.push({ type: 'deal', card: 6 })
    view = derive(history)
    expect(view.phase).toBe('play')
    expect(view.active).toBe(2)
    // Seat 2 may lead anything T does not hold.
    expect(view.enabled).toBe(0xffffff & ~0b1011111)
    expect(view.job).toBeNull()
  })

  it('offers T both ways to play a card of a Felső + Király pair', () => {
    const felso = cardOf(PIROS, FELSO)
    const kiraly = cardOf(PIROS, KIRALY)
    const history: Input[] = [{ type: 'starter', seat: T }]
    for (const card of [0, 1, felso]) history.push({ type: 'deal', card })
    history.push({ type: 'adu', card: 23 })
    for (const card of [kiraly, 4, 5]) history.push({ type: 'deal', card })
    let view = derive(history)
    expect(view.announceable).toBe((1 << felso) | (1 << kiraly))
    expect(view.job?.choices).toEqual([0, 1, 2, 3, 4, 5, bonusChoice(felso), bonusChoice(kiraly)])
    expect(forcedInput(view)).toBeNull()
    const announced = [...history, inputFor(view, kiraly, true)]
    view = derive(announced)
    // Having announced, only that card can be played.
    expect(view.active).toBe(T)
    expect(view.enabled).toBe(1 << kiraly)
    expect(view.announceable).toBe(0)
    expect(view.job?.choices).toEqual([kiraly])
    expect(forcedInput(view)).toEqual({ type: 'choice', choice: kiraly })
    // So it is played without a tap, and taken back together with the announcement.
    const settled = settle(announced)
    view = derive(settled)
    expect(view.trick).toEqual([kiraly])
    expect(view.active).toBe(B)
    expect(undo(settled)).toEqual(history)
  })

  it('rejects inputs that cannot happen', () => {
    expect(() => derive([{ type: 'deal', card: 0 }])).toThrow()
    expect(() => derive([{ type: 'starter', seat: 7 }])).toThrow()
    const dealt: Input[] = [
      { type: 'starter', seat: T },
      { type: 'deal', card: 0 },
    ]
    expect(() => derive([...dealt, { type: 'deal', card: 0 }])).toThrow()
    expect(() => derive([...dealt, { type: 'adu', card: 3 }])).toThrow()
  })

  it('follows whole games, offering each move that was actually made', () => {
    for (const fixture of (games as FixtureGame[]).slice(0, 120)) {
      const history = setupInputs(fixture)
      for (const [seat, chosen, ...legal] of fixture.decisions) {
        const view = derive(history)
        expect(view.phase).toBe('play')
        expect(view.active).toBe(seat)
        const offered = isBonus(chosen) ? view.announceable : view.enabled
        expect(offered & (1 << choiceCard(chosen))).not.toBe(0)
        if (seat === T) {
          expect([...view.job!.choices].sort((a, b) => a - b)).toEqual(legal)
        } else {
          expect(view.job).toBeNull()
          // Never offer a card T holds or one already played.
          expect(view.enabled & view.hand).toBe(0)
        }
        history.push(inputFor(view, choiceCard(chosen), isBonus(chosen)))
      }
      const end = derive(history)
      expect(end.phase).toBe('over')
      expect(end.outcome).toEqual(fixture.outcome)
      expect(end.active).toBe(-1)
      // Undoing the last input goes back to the last decision.
      expect(derive(history.slice(0, -1)).phase).toBe('play')
    }
  }, 120_000)

  it('enters forced plays by itself and takes them back with the tap before them', () => {
    let forcedPlays = 0
    for (const fixture of (games as FixtureGame[]).slice(0, 120)) {
      const setup = setupInputs(fixture)
      let history = settle(setup)
      expect(history).toEqual(setup)
      fixture.decisions.forEach(([seat, chosen, ...legal], i) => {
        if (history.length > setup.length + i) {
          // Already entered: it has to be what was actually played.
          expect(history[setup.length + i]).toEqual({ type: 'choice', choice: chosen })
          forcedPlays++
          return
        }
        const view = derive(history)
        expect(forcedInput(view)).toBeNull()
        if (seat === T) expect(legal.length).toBeGreaterThan(1)
        const before = history
        history = settle([...history, inputFor(view, choiceCard(chosen), isBonus(chosen))])
        expect(undo(history)).toEqual(before)
      })
      expect(history.length).toBe(setup.length + fixture.decisions.length)
      expect(derive(history).phase).toBe('over')
    }
    expect(forcedPlays).toBeGreaterThan(0)
  }, 120_000)
})

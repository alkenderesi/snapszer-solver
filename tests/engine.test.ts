import { describe, expect, it } from 'vitest'
import {
  ALSO,
  ASZ,
  cardOf,
  FELSO,
  IX,
  KIRALY,
  MAKK,
  maskOf,
  PIROS,
  popcount,
  TOK,
  X,
  ZOLD,
} from '../src/engine/cards.ts'
import { Game } from '../src/engine/game.ts'
import { beats, bonusChoice, excludedByFollow, followMask } from '../src/engine/rules.ts'
import games from './fixtures/games.json'

interface FixtureGame {
  starter: number
  adu: number
  hands: number[]
  decisions: number[][]
  outcome: number[]
  score: number[]
  bonus: number[]
}

describe('parity with the Python library', () => {
  it('replays every fixture game with identical legal choices and outcome', () => {
    for (const fixture of games as FixtureGame[]) {
      const game = new Game(fixture.starter, fixture.adu, fixture.hands)
      for (const [seat, chosen, ...legal] of fixture.decisions) {
        expect(game.table.toMove).toBe(seat)
        expect(game.legalChoices().sort((a, b) => a - b)).toEqual(legal)
        game.apply(chosen)
      }
      expect(game.table.outcome).toEqual(fixture.outcome)
      expect(game.table.score).toEqual(fixture.score)
      expect(game.table.bonus).toEqual(fixture.bonus)
      expect(game.legalChoices()).toEqual([])
    }
  })
})

describe('cards', () => {
  it('beats a lower card of the same suit, and anything off-trump with a trump', () => {
    expect(beats(cardOf(ZOLD, ASZ), cardOf(ZOLD, X), PIROS)).toBe(true)
    expect(beats(cardOf(ZOLD, X), cardOf(ZOLD, ASZ), PIROS)).toBe(false)
    expect(beats(cardOf(ZOLD, ASZ), cardOf(ZOLD, ASZ), PIROS)).toBe(false)
    expect(beats(cardOf(PIROS, IX), cardOf(ZOLD, ASZ), PIROS)).toBe(true)
    expect(beats(cardOf(ZOLD, ASZ), cardOf(PIROS, IX), PIROS)).toBe(false)
    expect(beats(cardOf(ZOLD, ASZ), cardOf(TOK, IX), PIROS)).toBe(false)
  })

  it('counts bits', () => {
    expect(popcount(0)).toBe(0)
    expect(popcount(0xffffff)).toBe(24)
    expect(popcount(0b1011)).toBe(3)
  })
})

describe('following', () => {
  const trump = PIROS
  const hand = maskOf([
    cardOf(ZOLD, IX),
    cardOf(ZOLD, KIRALY),
    cardOf(ZOLD, ASZ),
    cardOf(PIROS, ALSO),
    cardOf(PIROS, X),
    cardOf(TOK, FELSO),
  ])

  it('follows suit and beats when it can', () => {
    expect(followMask(hand, ZOLD, trump, cardOf(ZOLD, FELSO))).toBe(
      maskOf([cardOf(ZOLD, KIRALY), cardOf(ZOLD, ASZ)]),
    )
  })

  it('follows suit with anything when it cannot beat', () => {
    const low = maskOf([cardOf(ZOLD, IX), cardOf(ZOLD, ALSO), cardOf(TOK, ASZ)])
    expect(followMask(low, ZOLD, trump, cardOf(ZOLD, X))).toBe(
      maskOf([cardOf(ZOLD, IX), cardOf(ZOLD, ALSO)]),
    )
    expect(followMask(hand, ZOLD, trump, cardOf(PIROS, IX))).toBe(
      maskOf([cardOf(ZOLD, IX), cardOf(ZOLD, KIRALY), cardOf(ZOLD, ASZ)]),
    )
  })

  it('trumps when void, beating a trump already played if it can', () => {
    expect(followMask(hand, MAKK, trump, cardOf(MAKK, ASZ))).toBe(
      maskOf([cardOf(PIROS, ALSO), cardOf(PIROS, X)]),
    )
    expect(followMask(hand, MAKK, trump, cardOf(PIROS, FELSO))).toBe(maskOf([cardOf(PIROS, X)]))
    expect(followMask(hand, MAKK, trump, cardOf(PIROS, ASZ))).toBe(
      maskOf([cardOf(PIROS, ALSO), cardOf(PIROS, X)]),
    )
  })

  it('plays anything with neither the lead suit nor a trump', () => {
    const offSuit = maskOf([cardOf(TOK, IX), cardOf(ZOLD, ASZ)])
    expect(followMask(offSuit, MAKK, trump, cardOf(MAKK, IX))).toBe(offSuit)
    expect(followMask(offSuit, PIROS, trump, cardOf(PIROS, IX))).toBe(offSuit)
  })

  it('reveals exactly the cards that would have forced a different play', () => {
    // Every (hand, lead, winning) combination: a card is playable exactly when
    // the hand holds none of the cards that playing it rules out.
    let state = 12345
    const random = () => (state = (Math.imul(state, 1103515245) + 12345) >>> 0)
    for (let i = 0; i < 20000; i++) {
      const hand = random() & 0xffffff
      const lead = random() % 24
      let winning = lead
      const other = random() % 24
      if (other !== lead && beats(other, lead, trump)) winning = other
      const leadSuit = (lead / 6) | 0
      const legal = followMask(hand & ~(1 << lead) & ~(1 << winning), leadSuit, trump, winning)
      for (let card = 0; card < 24; card++) {
        if (card === lead || card === winning || !(hand & (1 << card))) continue
        const held = hand & ~(1 << lead) & ~(1 << winning)
        const excluded = excludedByFollow(card, leadSuit, trump, winning)
        expect((held & excluded) === 0).toBe((legal & (1 << card)) !== 0)
      }
    }
  })
})

describe('game flow', () => {
  // Each seat holds one whole suit; PIROS ASZ is the adu and seat 0 starts alone.
  const suits = [0x3f, 0x3f << 6, 0x3f << 12, 0x3f << 18]
  const adu = cardOf(PIROS, ASZ)

  it('offers a play per card and an announcement for both cards of a pair', () => {
    const game = new Game(0, adu, suits)
    expect(game.legalChoices()).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      bonusChoice(cardOf(PIROS, FELSO)),
      bonusChoice(cardOf(PIROS, KIRALY)),
    ])
  })

  it('forces the announced card and scores 40 in trump, 20 elsewhere', () => {
    const game = new Game(0, adu, suits)
    game.apply(bonusChoice(cardOf(PIROS, KIRALY)))
    expect(game.table.bonus[0]).toBe(40)
    expect(game.legalChoices()).toEqual([cardOf(PIROS, KIRALY)])
    const other = new Game(1, adu, suits)
    other.apply(bonusChoice(cardOf(ZOLD, FELSO)))
    expect(other.table.bonus[1]).toBe(20)
  })

  it('ends at 66 only once the adu is out, and announcements need trick points', () => {
    const game = new Game(0, adu, suits)
    game.apply(bonusChoice(cardOf(PIROS, KIRALY)))
    for (const card of [cardOf(PIROS, KIRALY), cardOf(ZOLD, ASZ), cardOf(TOK, ASZ)]) {
      game.apply(card)
    }
    game.apply(cardOf(MAKK, ASZ))
    // 37 trick points + 40 announced, but the adu is still in hand.
    expect(game.table.score[0]).toBe(37)
    expect(game.table.isOver).toBe(false)
    expect(game.table.toMove).toBe(0)
    for (const card of [adu, cardOf(ZOLD, IX), cardOf(TOK, IX)]) game.apply(card)
    game.apply(cardOf(MAKK, IX))
    expect(game.table.outcome).toEqual([3, 0, 0, 0])
  })

  it('covers both endings in the fixtures: 66 reached early, and all cards played', () => {
    const plays = (games as FixtureGame[]).map(
      (fixture) => fixture.decisions.filter(([, chosen]) => chosen < 24).length,
    )
    expect(plays.some((count) => count === 24)).toBe(true)
    expect(plays.some((count) => count < 24)).toBe(true)
  })
})

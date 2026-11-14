import { describe, expect, it } from 'vitest'
import { cardsOf } from '../src/engine/cards.ts'
import { Game } from '../src/engine/game.ts'
import { DealSpace } from '../src/solver/deals.ts'
import {
  ADU_CHOICES,
  bestChoices,
  CELLS,
  ITERATION_CAP,
  type Job,
  JobRunner,
} from '../src/solver/job.ts'
import { Knowledge } from '../src/solver/knowledge.ts'
import { Solver } from '../src/solver/minimax.ts'
import games from './fixtures/games.json'

interface FixtureGame {
  starter: number
  adu: number
  hands: number[]
  decisions: number[][]
}

/** The job seat 0 faces at its first decision after `skip` decisions of a fixture game. */
function jobAt(fixture: FixtureGame, skip: number): Job | null {
  const game = new Game(fixture.starter, fixture.adu, fixture.hands)
  const knowledge = new Knowledge()
  for (const card of cardsOf(fixture.hands[0])) knowledge.hold(0, card)
  knowledge.closeHand(0)
  for (const [i, [seat, chosen]] of fixture.decisions.entries()) {
    if (seat === 0 && i >= skip) {
      const table = game.table
      return {
        kind: 'play',
        possible: knowledge.possible.slice(),
        handSize: [...knowledge.handSize],
        unplayed: knowledge.unplayed,
        position: {
          starter: table.starter,
          adu: table.adu,
          aduHolder: table.aduHolder,
          toMove: 0,
          trick: [...table.trick],
          trickSeats: [...table.trickSeats],
          score: [...table.score],
          bonus: [...table.bonus],
        },
        choices: game.legalChoices(),
        seed: 12345 + i,
      }
    }
    knowledge.observe(game.table, chosen)
    game.apply(chosen)
  }
  return null
}

function runAll(job: Job, workers: number) {
  const tally = new Uint32Array(job.choices.length * CELLS)
  let done = 0
  for (let worker = 0; worker < workers; worker++) {
    const runner = new JobRunner(job, worker, workers)
    while (!runner.run(50)) {
      // keep going until this worker's share is finished
    }
    done += runner.done
    runner.tally.forEach((count, i) => (tally[i] += count))
  }
  return { done, tally }
}

describe('job runner', () => {
  it('visits every consistent deal exactly once when there are few enough', () => {
    let jobs = 0
    for (const fixture of (games as FixtureGame[]).slice(0, 40)) {
      const job = jobAt(fixture, 9)
      if (!job) continue
      const space = new DealSpace(new Knowledge(job.possible, job.handSize, job.unplayed))
      expect(space.count).toBeLessThanOrEqual(ITERATION_CAP)

      // The same tallies, computed by walking the deals in plain order.
      const expected = new Uint32Array(job.choices.length * CELLS)
      const solver = new Solver()
      const hands = new Int32Array(4)
      const values = new Int8Array(job.choices.length)
      for (let index = 0; index < space.count; index++) {
        space.unrank(index, hands)
        solver.evaluate(job.position, hands, job.choices, values)
        const { starter, adu, aduHolder } = job.position
        job.choices.forEach((_, i) => {
          for (let seat = 0; seat < 4; seat++) {
            const holder = aduHolder >= 0 ? aduHolder : [...hands].findIndex((h) => h & (1 << adu))
            const aduTeam = seat === starter || seat === holder
            const score = aduTeam ? Math.max(values[i], 0) : Math.max(-values[i], 0)
            expected[i * CELLS + seat * 4 + score]++
          }
        })
      }

      for (const workers of [1, 3, 7]) {
        const { done, tally } = runAll(job, workers)
        expect(done).toBe(space.count)
        expect(tally).toEqual(expected)
      }
      jobs++
    }
    expect(jobs).toBeGreaterThan(20)
  }, 120_000)

  it('gives every choice and every seat the same number of iterations', () => {
    const job = jobAt((games as FixtureGame[])[3], 0)!
    const runner = new JobRunner(job, 0, 4)
    runner.run(150)
    expect(runner.done).toBeGreaterThan(0)
    for (let i = 0; i < job.choices.length; i++) {
      for (let seat = 0; seat < 4; seat++) {
        const cells = runner.tally.subarray(i * CELLS + seat * 4, i * CELLS + seat * 4 + 4)
        expect(cells.reduce((sum, count) => sum + count, 0)).toBe(runner.done)
      }
    }
  })

  it('samples when there are too many deals, and stops at the cap', () => {
    const knowledge = new Knowledge()
    for (const card of [0, 7, 14]) knowledge.hold(0, card)
    const job: Job = {
      kind: 'adu',
      possible: knowledge.possible,
      handSize: knowledge.handSize,
      unplayed: knowledge.unplayed,
      position: {
        starter: 0,
        adu: 0,
        aduHolder: -1,
        toMove: 0,
        trick: [],
        trickSeats: [],
        score: [0, 0, 0, 0],
        bonus: [0, 0, 0, 0],
      },
      choices: ADU_CHOICES,
      seed: 99,
    }
    const shares = [0, 1, 2].map((worker) => new JobRunner(job, worker, 3).total)
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(ITERATION_CAP)
    const runner = new JobRunner(job, 0, 3)
    runner.run(200)
    expect(runner.done).toBeGreaterThan(0)
    // Whatever the adu, the two teams' scores are complementary on every deal.
    for (let adu = 0; adu < 24; adu++) {
      const winners = [0, 1, 2, 3].map((seat) => runner.done - runner.tally[adu * CELLS + seat * 4])
      expect(winners[0]).toBeGreaterThanOrEqual(0)
      expect(winners.reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(runner.done)
    }
  })
})

/** A tally from each choice's counts per seat: `choices[choice][seat]` is that seat's counts of scores 0..3. */
function tallyOf(choices: number[][][]): Uint32Array {
  const tally = new Uint32Array(choices.length * CELLS)
  choices.forEach((seats, choice) =>
    seats.forEach((counts, seat) => tally.set(counts, choice * CELLS + seat * 4)),
  )
  return tally
}

describe('bestChoices', () => {
  const others = [
    [10, 0, 0, 0],
    [10, 0, 0, 0],
    [10, 0, 0, 0],
  ]

  it('picks the choice with the highest mean score', () => {
    const tally = tallyOf([
      [[6, 4, 0, 0], ...others],
      [[3, 7, 0, 0], ...others],
      [[5, 5, 0, 0], ...others],
    ])
    expect(bestChoices(tally, 0)).toEqual(new Set([1]))
  })

  it('weighs a win by its score', () => {
    // Three wins of 3 are worth more than eight wins of 1.
    const tally = tallyOf([
      [[2, 8, 0, 0], ...others],
      [[7, 0, 0, 3], ...others],
    ])
    expect(bestChoices(tally, 0)).toEqual(new Set([1]))
  })

  it('returns every choice that ties for the highest', () => {
    const tally = tallyOf([
      [[4, 6, 0, 0], ...others],
      [[5, 5, 0, 0], ...others],
      [[7, 0, 3, 0], ...others],
      [[8, 0, 0, 2], ...others],
    ])
    expect(bestChoices(tally, 0)).toEqual(new Set([0, 2, 3]))
  })

  it('returns every choice when the seat never scores', () => {
    const tally = tallyOf([
      [[10, 0, 0, 0], ...others],
      [[10, 0, 0, 0], ...others],
    ])
    expect(bestChoices(tally, 0)).toEqual(new Set([0, 1]))
  })

  it('reads only the column of the seat asked about', () => {
    const tally = tallyOf([
      [
        [9, 1, 0, 0],
        [0, 0, 0, 10],
        [0, 0, 0, 10],
        [0, 0, 0, 10],
      ],
      [
        [8, 2, 0, 0],
        [10, 0, 0, 0],
        [10, 0, 0, 0],
        [10, 0, 0, 0],
      ],
    ])
    expect(bestChoices(tally, 0)).toEqual(new Set([1]))
    expect(bestChoices(tally, 2)).toEqual(new Set([0]))
  })
})

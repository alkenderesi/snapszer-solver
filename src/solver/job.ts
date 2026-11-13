import { CARD_COUNT, PLAYER_COUNT } from '../engine/cards.ts'
import { DealSpace } from './deals.ts'
import { Knowledge } from './knowledge.ts'
import { type Position, Solver } from './minimax.ts'

/** Stop after this many iterations, or sooner when every consistent deal has been visited. */
export const ITERATION_CAP = 1_000_000
/** Tally cells per choice: 4 seats × 4 scores (0..3), at [seat * 4 + score]. */
export const CELLS = PLAYER_COUNT * 4

/** One decision of T's to evaluate. Plain data, so it can be posted to a worker. */
export interface Job {
  /** 'adu': T picks the adu card with part of its hand unseen. 'play': T plays or announces. */
  kind: 'adu' | 'play'
  /** What T knows: possible seats per card, cards per seat, unplayed cards. */
  possible: Uint8Array
  handSize: number[]
  unplayed: number
  position: Position
  /** The choices to score, in tally order. For 'adu' these are the 24 cards. */
  choices: number[]
  /** Shared by all workers so they agree on the order deals are visited in. */
  seed: number
}

/** Iterations a job will run in total across all workers. */
export const iterationsOf = (dealCount: number): number => Math.min(dealCount, ITERATION_CAP)

/**
 * One worker's share of a job. Every iteration takes one consistent deal,
 * solves it for every choice and adds each seat's score to that choice's
 * tally, so all choices always have the same number of iterations.
 */
export class JobRunner {
  /** Iterations this runner will do, and has done. */
  readonly total: number
  done = 0
  /** Counts at [choice * CELLS + seat * 4 + score]. */
  readonly tally: Uint32Array

  private readonly job: Job
  private readonly space: DealSpace
  private readonly solver = new Solver()
  private readonly hands = new Int32Array(PLAYER_COUNT)
  private readonly values: Int8Array
  private readonly exhaustive: boolean
  private readonly stride: number
  private readonly workers: number
  private position: number
  private readonly random: () => number

  constructor(job: Job, worker: number, workers: number) {
    this.job = job
    this.space = new DealSpace(new Knowledge(job.possible, job.handSize, job.unplayed))
    this.tally = new Uint32Array(job.choices.length * CELLS)
    this.values = new Int8Array(job.choices.length)
    const count = this.space.count
    const iterations = iterationsOf(count)
    // Iteration k belongs to worker k mod workers.
    this.workers = workers
    this.position = worker
    this.total = Math.max(0, Math.ceil((iterations - worker) / workers))
    this.exhaustive = count <= ITERATION_CAP
    // A stride coprime to the count walks every deal once in a scattered
    // order, so a partial tally is already an unbiased sample.
    let stride = Math.max(1, Math.floor(count * 0.6180339887))
    while (gcd(stride, count) !== 1) stride++
    this.stride = stride
    this.random = generator(job.seed + worker * 0x9e3779b9)
  }

  /** Runs iterations for about `budget` milliseconds. Returns true once finished. */
  run(budget: number): boolean {
    const deadline = performance.now() + budget
    const { space, hands, values, job, tally } = this
    const { position, choices } = job
    const count = space.count
    const offset = job.seed % count
    while (this.done < this.total) {
      for (let batch = 0; batch < 8 && this.done < this.total; batch++) {
        const index = this.exhaustive
          ? (this.position * this.stride + offset) % count
          : Math.floor(this.random() * count)
        space.unrank(index, hands)
        if (job.kind === 'adu') {
          this.solver.evaluateAdu(hands, position.starter, values)
        } else {
          this.solver.evaluate(position, hands, choices, values)
        }
        for (let i = 0; i < choices.length; i++) {
          const value = values[i]
          const holder = job.kind === 'adu' ? holderOf(hands, choices[i]) : position.aduHolder
          for (let seat = 0; seat < PLAYER_COUNT; seat++) {
            const aduTeam =
              seat === position.starter ||
              (holder >= 0 ? seat === holder : (hands[seat] & (1 << position.adu)) !== 0)
            const score = aduTeam ? (value > 0 ? value : 0) : value < 0 ? -value : 0
            tally[i * CELLS + seat * 4 + score]++
          }
        }
        this.position += this.workers
        this.done++
      }
      if (performance.now() >= deadline) break
    }
    return this.done >= this.total
  }
}

function holderOf(hands: Int32Array, card: number): number {
  for (let seat = 0; seat < PLAYER_COUNT; seat++) if (hands[seat] & (1 << card)) return seat
  return -1
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

/** A small fast generator returning 53-bit uniform numbers in [0, 1). */
function generator(seed: number): () => number {
  let a = seed | 0
  let b = 0x9e3779b9 | 0
  let c = 0x243f6a88 | 0
  let d = 0xb7e15162 | 0
  const next = (): number => {
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return t >>> 0
  }
  for (let i = 0; i < 12; i++) next()
  return () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992
}

export const ADU_CHOICES = Array.from({ length: CARD_COUNT }, (_, card) => card)

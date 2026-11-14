// Solver throughput on one thread. Run with: npm run bench
import { cardsOf } from '../src/engine/cards.ts'
import { Game } from '../src/engine/game.ts'
import { DealSpace } from '../src/solver/deals.ts'
import { Knowledge } from '../src/solver/knowledge.ts'
import { Solver } from '../src/solver/minimax.ts'
import { randomDeal, randomSource } from '../tests/reference.ts'

const random = randomSource(3)
const deals = Array.from({ length: 512 }, () => randomDeal(random))
const adus = deals.map(() => Math.floor(random() * 24))
const solver = new Solver()

function measure(name: string, rounds: number, run: (i: number) => void) {
  for (let i = 0; i < Math.min(rounds, 200); i++) run(i) // warm up
  const nodes = solver.nodes
  const start = performance.now()
  for (let i = 0; i < rounds; i++) run(i)
  const seconds = (performance.now() - start) / 1000
  const perRun = Math.round((solver.nodes - nodes) / rounds)
  console.log(
    `${name.padEnd(44)} ${Math.round(rounds / seconds)
      .toLocaleString()
      .padStart(10)} /s` + (perRun ? `   ${perRun.toLocaleString()} nodes each` : ''),
  )
}

measure('first lead, every choice of the leader', 4000, (i) => {
  const d = i % deals.length
  const choices = new Game(0, adus[d], deals[d]).legalChoices()
  solver.evaluate(
    {
      starter: 0,
      adu: adus[d],
      aduHolder: -1,
      toMove: 0,
      trick: [],
      trickSeats: [],
      score: [0, 0, 0, 0],
      bonus: [0, 0, 0, 0],
    },
    deals[d],
    choices,
    new Int8Array(choices.length),
  )
})

const values = new Int8Array(24)
measure('adu choice, all 24 adu cards', 400, (i) => {
  solver.evaluateAdu(deals[i % deals.length], 0, values)
})

const knowledge = new Knowledge()
for (const card of cardsOf(deals[0][0])) knowledge.hold(0, card)
knowledge.closeHand(0)
const space = new DealSpace(knowledge)
const hands = new Int32Array(4)
measure('unrank one of 17,153,136 deals', 2_000_000, () => {
  space.unrank(Math.floor(random() * space.count), hands)
})

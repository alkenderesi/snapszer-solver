import type { CSSProperties } from 'react'
import { cardOf, RANK_COUNT, SUIT_COUNT, SUIT_MASKS } from '../engine/cards.ts'
import { bonusChoice, bonusScore } from '../engine/rules.ts'
import { CELLS } from '../solver/job.ts'
import type { Progress } from '../solver/pool.ts'
import { Face } from './faces.tsx'
import { ResultTable } from './ResultTable.tsx'

interface Props {
  seat: number
  /** Mask of the cards that can be tapped. */
  enabled: number
  /** Mask of the cards whose table also has an announced variant. */
  announceable: number
  /** The adu suit, which decides whether an announcement is worth 20 or 40. */
  trump: number
  /** T's own cards, drawn stronger than cards nobody can pick. */
  held: number
  /** Whether held cards are picks already made (dealing) rather than cards in hand. */
  picking: boolean
  /** The card whose two ways to play it are on offer, or -1. */
  armed: number
  onTap: (card: number, element: HTMLElement) => void
  /** Set when every choice gets a result table: the choices in tally order, and the tallies so far. */
  results: { choices: number[]; progress: Progress | null } | null
}

// Heights in grid units, used to shrink the grid when announced tables add rows.
const CARD = 5
const TABLE = 10.8
const GAP = 0.9
const ROOM = 66.5

/** The 6 × 4 grid of all cards at one seat: a column per rank, a row per suit. */
export function Grid({
  seat,
  enabled,
  announceable,
  trump,
  held,
  picking,
  armed,
  onTap,
  results,
}: Props) {
  const tables = results !== null
  let scale = 1
  if (tables) {
    const extraRows = SUIT_MASKS.filter((mask) => announceable & mask).length
    const height = SUIT_COUNT * (CARD + TABLE) + (SUIT_COUNT - 1) * GAP + extraRows * TABLE
    scale = Math.min(1, ROOM / height)
  }
  const progress = results?.progress ?? null
  const cells = []
  for (let suit = 0; suit < SUIT_COUNT; suit++) {
    for (let rank = 0; rank < RANK_COUNT; rank++) {
      const card = cardOf(suit, rank)
      const bit = 1 << card
      const on = (enabled & bit) !== 0
      const state = on ? 'on' : held & bit ? (picking ? 'picked' : 'dim') : 'off'
      const plain = results ? results.choices.indexOf(card) : -1
      const announced = results ? results.choices.indexOf(bonusChoice(card)) : -1
      cells.push(
        <div className={`cell ${state}${armed === card ? ' armed' : ''}`} key={card}>
          <button className="card" disabled={!on} onClick={(e) => onTap(card, e.currentTarget)}>
            <Face card={card} />
          </button>
          {tables && (
            <div className="slot">
              {plain >= 0 && (
                <ResultTable
                  tally={progress?.tally ?? null}
                  offset={plain * CELLS}
                  done={progress?.done ?? 0}
                />
              )}
              {announced >= 0 && (
                <ResultTable
                  tally={progress?.tally ?? null}
                  offset={announced * CELLS}
                  done={progress?.done ?? 0}
                  bonus={bonusScore(card, trump)}
                />
              )}
            </div>
          )}
        </div>,
      )
    }
  }
  return (
    <div
      className={`grid seat${seat} ${tables ? 'tables' : 'compact'}`}
      style={{ '--s': scale } as CSSProperties}
    >
      {tables && (
        <div
          className="progress"
          style={{ width: progress ? `${(100 * progress.done) / (progress.total || 1)}%` : 0 }}
        />
      )}
      {cells}
    </div>
  )
}

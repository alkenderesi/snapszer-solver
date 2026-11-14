import { Fragment } from 'react'

const SEATS = ['T', 'B', 'P', 'A']
const SCORES = [0, 1, 2, 3]

interface Props {
  /** Counts at [offset + seat * 4 + score], or null before any result exists. */
  tally: Uint32Array | null
  offset: number
  /** Iterations the counts are out of. */
  done: number
  /** For the table of an announced play: the points announced, 20 or 40. */
  bonus?: number
  /** Leave cells with no count empty instead of showing 0. */
  sparse?: boolean
}

/** A column per player, a row per score, each cell the percentage of iterations. */
export function ResultTable({ tally, offset, done, bonus, sparse }: Props) {
  const cell = (seat: number, score: number): string => {
    if (!tally || done === 0) return ''
    const count = tally[offset + seat * 4 + score]
    if (sparse && count === 0) return ''
    return String(Math.round((100 * count) / done))
  }
  return (
    <div className="table">
      <span>{bonus}</span>
      {SEATS.map((name) => (
        <span className="label" key={name}>
          {name}
        </span>
      ))}
      {SCORES.map((score) => (
        <Fragment key={score}>
          <span className="label">{score}</span>
          {SEATS.map((name, seat) => (
            <span key={name}>{cell(seat, score)}</span>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

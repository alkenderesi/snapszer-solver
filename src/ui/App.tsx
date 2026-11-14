import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { derive, type Input, inputFor, settle, undo } from '../app/history.ts'
import { loadHistory, saveHistory } from '../app/store.ts'
import { suitOf } from '../engine/cards.ts'
import { bonusScore } from '../engine/rules.ts'
import { SolverPool } from '../solver/pool.ts'
import { BackIcon, CardBack, Check, Face, ResetIcon } from './faces.tsx'
import { Grid } from './Grid.tsx'
import { ResultTable } from './ResultTable.tsx'

const pool = new SolverPool()

/** The stage is 140 × 100 units; everything is placed and sized in these. */
const STAGE_WIDTH = 140
const STAGE_HEIGHT = 100
/** A popup button ignores taps this soon after appearing, so one bouncing tap cannot press it. */
const POPUP_DELAY = 250

/** A tap that needs a second one: a card with two ways to play it, or the reset. */
type Target = { kind: 'card'; card: number } | { kind: 'reset' }
/** A target tapped once: where to show its popup, and when it was tapped. */
type Armed = Target & { x: number; y: number; at: number }

export function App() {
  const [history, setHistory] = useState<Input[]>(loadHistory)
  const [armed, setArmed] = useState<Armed | null>(null)
  const board = useRef<HTMLDivElement>(null)
  const view = useMemo(() => derive(history), [history])
  const latest = useSyncExternalStore(pool.subscribe, pool.getProgress)
  const progress = latest && latest.job === view.job ? latest : null

  useEffect(() => saveHistory(history), [history])
  useEffect(() => {
    if (view.job) pool.start(view.job)
    else pool.stop()
  }, [view])

  const arm = (target: Target, element: HTMLElement) => {
    const frame = board.current!.getBoundingClientRect()
    const box = element.getBoundingClientRect()
    const unit = frame.width / STAGE_WIDTH
    setArmed({
      ...target,
      x: (box.left + box.width / 2 - frame.left) / unit,
      y: (box.top + box.height / 2 - frame.top) / unit,
      at: performance.now(),
    })
  }
  const press = (act: () => void) => () => {
    if (!armed || performance.now() - armed.at < POPUP_DELAY) return
    setArmed(null)
    act()
  }
  const push = (input: Input) => setHistory((inputs) => settle([...inputs, input]))
  const tap = (card: number, element: HTMLElement) => {
    if (view.announceable & (1 << card)) arm({ kind: 'card', card }, element)
    else push(inputFor(view, card, false))
  }

  const final = useMemo(() => {
    if (!view.outcome) return null
    const tally = new Uint32Array(16)
    view.outcome.forEach((points, seat) => (tally[seat * 4 + points] = 1))
    return tally
  }, [view.outcome])

  return (
    <div className="viewport" onContextMenu={(event) => event.preventDefault()}>
      <div className="stage">
        <div className={`board${view.job ? ' mine' : ''}`} ref={board}>
          {view.phase === 'starter' &&
            [0, 1, 2, 3].map((seat) => (
              <button
                className={`pick seat${seat}`}
                key={seat}
                onClick={() => push({ type: 'starter', seat })}
              >
                <CardBack />
              </button>
            ))}

          {view.adu >= 0 && (
            <div className="adu">
              <div className="played">
                <Face card={view.adu} />
              </div>
              <i className={`dot seat${view.starter}`} />
            </div>
          )}

          {final ? (
            <div className="outcome">
              <ResultTable tally={final} offset={0} done={1} sparse />
            </div>
          ) : (
            <div className="trick">
              {view.trick.map((card, i) => (
                <div className={`played seat${view.trickSeats[i]}`} key={card}>
                  <Face card={card} />
                </div>
              ))}
            </div>
          )}

          {view.active >= 0 && (
            <Grid
              seat={view.active}
              enabled={view.enabled}
              announceable={view.announceable}
              trump={suitOf(view.adu)}
              held={view.active === 0 ? view.hand : 0}
              picking={view.phase === 'deal'}
              armed={armed?.kind === 'card' ? armed.card : -1}
              onTap={tap}
              results={view.job ? { choices: view.job.choices, progress } : null}
            />
          )}

          <button
            className="control back"
            disabled={history.length === 0}
            onClick={() => setHistory(undo)}
          >
            <BackIcon />
          </button>
          <button
            className="control reset"
            disabled={history.length === 0}
            onClick={(event) => arm({ kind: 'reset' }, event.currentTarget)}
          >
            <ResetIcon />
          </button>

          {armed && (
            <>
              <div className="veil" onPointerDown={() => setArmed(null)} />
              <div
                className="popup"
                style={{
                  left: `${(100 * clamp(armed.x, armed.kind === 'card' ? 14.5 : 8, STAGE_WIDTH)) / STAGE_WIDTH}%`,
                  top: `${(100 * clamp(armed.y, 9.5, STAGE_HEIGHT)) / STAGE_HEIGHT}%`,
                }}
              >
                {armed.kind === 'card' && (
                  <>
                    <button
                      className="option"
                      onClick={press(() => push(inputFor(view, armed.card, false)))}
                    >
                      <span className="face">
                        <Face card={armed.card} />
                      </span>
                    </button>
                    <button
                      className="option"
                      onClick={press(() => push(inputFor(view, armed.card, true)))}
                    >
                      <span className="bonus">{bonusScore(armed.card, suitOf(view.adu))}</span>
                      <span className="face">
                        <Face card={armed.card} />
                      </span>
                    </button>
                  </>
                )}
                {armed.kind === 'reset' && (
                  <button className="option" onClick={press(() => setHistory([]))}>
                    <ResetIcon />
                    <Check />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Keeps a popup of half-size `margin` centred at `value` inside a stage `size` wide. */
const clamp = (value: number, margin: number, size: number): number =>
  Math.min(Math.max(value, margin), size - margin)

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { derive, type Input, inputFor } from '../app/history.ts'
import { loadHistory, saveHistory } from '../app/store.ts'
import { SolverPool } from '../solver/pool.ts'
import { BackIcon, CardBack, Check, Face, ResetIcon, RingedCheck } from './faces.tsx'
import { Grid } from './Grid.tsx'
import { ResultTable } from './ResultTable.tsx'

const pool = new SolverPool()

/** The stage is 140 × 100 units; everything is placed and sized in these. */
const STAGE_WIDTH = 140
const STAGE_HEIGHT = 100
/** A confirm button ignores taps this soon after appearing, so one bouncing tap cannot confirm. */
const CONFIRM_DELAY = 250

/** Something that needs a second, confirming tap. */
type Target = { kind: 'card'; card: number } | { kind: 'starter'; seat: number } | { kind: 'reset' }
/** A target tapped once: where to show its confirm buttons, and when it was tapped. */
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
  const confirm = (act: () => void) => () => {
    if (!armed || performance.now() - armed.at < CONFIRM_DELAY) return
    setArmed(null)
    act()
  }
  const push = (input: Input) => setHistory((inputs) => [...inputs, input])

  const announce = armed?.kind === 'card' && (view.announceable & (1 << armed.card)) !== 0
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
                onClick={(event) => arm({ kind: 'starter', seat }, event.currentTarget)}
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
              held={view.active === 0 ? view.hand : 0}
              picking={view.phase === 'deal'}
              armed={armed?.kind === 'card' ? armed.card : -1}
              onTap={(card, element) => arm({ kind: 'card', card }, element)}
              results={view.job ? { choices: view.job.choices, progress } : null}
            />
          )}

          <button
            className="control back"
            disabled={history.length === 0}
            onClick={() => setHistory((inputs) => inputs.slice(0, -1))}
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
                  left: `${(100 * clamp(armed.x, announce ? 14.5 : 8, STAGE_WIDTH)) / STAGE_WIDTH}%`,
                  top: `${(100 * clamp(armed.y, 9.5, STAGE_HEIGHT)) / STAGE_HEIGHT}%`,
                }}
              >
                {armed.kind === 'card' && (
                  <>
                    <button
                      className="confirm"
                      onClick={confirm(() => push(inputFor(view, armed.card, false)))}
                    >
                      <span className="face">
                        <Face card={armed.card} />
                      </span>
                      <Check />
                    </button>
                    {announce && (
                      <button
                        className="confirm"
                        onClick={confirm(() => push(inputFor(view, armed.card, true)))}
                      >
                        <span className="face">
                          <Face card={armed.card} />
                        </span>
                        <RingedCheck />
                      </button>
                    )}
                  </>
                )}
                {armed.kind === 'starter' && (
                  <button
                    className="confirm"
                    onClick={confirm(() => push({ type: 'starter', seat: armed.seat }))}
                  >
                    <CardBack />
                    <Check />
                  </button>
                )}
                {armed.kind === 'reset' && (
                  <button className="confirm" onClick={confirm(() => setHistory([]))}>
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

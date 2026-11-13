import { DealSpace } from './deals.ts'
import { CELLS, iterationsOf, type Job } from './job.ts'
import { Knowledge } from './knowledge.ts'
import type { Report, Request } from './worker.ts'

/** The running totals of a job: iterations done, and counts per choice, seat and score. */
export interface Progress {
  /** The job these totals belong to. */
  job: Job
  done: number
  total: number
  /** Counts at [choice * CELLS + seat * 4 + score]. */
  tally: Uint32Array
}

const NOTIFY_EVERY = 100

/**
 * Runs one job at a time across all workers and merges their tallies. A new
 * job, or `stop`, abandons whatever was running.
 */
export class SolverPool {
  private readonly workers: Worker[] = []
  private readonly reports: (Report | null)[] = []
  private readonly listeners = new Set<() => void>()
  private jobId = 0
  private job: Job | null = null
  private total = 0
  private progress: Progress | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(size = Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 12))) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<Report>) => this.receive(event.data)
      this.workers.push(worker)
      this.reports.push(null)
    }
  }

  start(job: Job): void {
    this.jobId++
    this.job = job
    this.total = iterationsOf(
      new DealSpace(new Knowledge(job.possible, job.handSize, job.unplayed)).count,
    )
    this.reports.fill(null)
    this.progress = {
      job,
      done: 0,
      total: this.total,
      tally: new Uint32Array(job.choices.length * CELLS),
    }
    this.workers.forEach((worker, index) => {
      const request: Request = {
        type: 'start',
        id: this.jobId,
        job,
        worker: index,
        workers: this.workers.length,
      }
      worker.postMessage(request)
    })
    this.notify()
  }

  stop(): void {
    this.jobId++
    this.job = null
    this.progress = null
    for (const worker of this.workers) worker.postMessage({ type: 'stop' } satisfies Request)
    this.notify()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getProgress = (): Progress | null => this.progress

  private receive(report: Report): void {
    if (report.id !== this.jobId) return
    this.reports[report.worker] = report
    // Merge at a steady pace however many workers are reporting.
    this.timer ??= setTimeout(() => {
      this.timer = null
      this.merge()
    }, NOTIFY_EVERY)
  }

  private merge(): void {
    const job = this.job
    if (!job) return
    const tally = new Uint32Array(job.choices.length * CELLS)
    let done = 0
    for (const report of this.reports) {
      if (!report || report.id !== this.jobId) continue
      done += report.done
      for (let i = 0; i < tally.length; i++) tally[i] += report.tally[i]
    }
    this.progress = { job, done, total: this.total, tally }
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}

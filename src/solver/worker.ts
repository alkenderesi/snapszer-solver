import { type Job, JobRunner } from './job.ts'

export type Request =
  { type: 'start'; id: number; job: Job; worker: number; workers: number } | { type: 'stop' }

export interface Report {
  id: number
  worker: number
  done: number
  tally: Uint32Array
}

const SLICE = 20
const REPORT_EVERY = 100

let current: { id: number; worker: number; runner: JobRunner } | null = null
let lastReport = 0

// A message to ourselves yields to the event loop without the delay a timer
// adds, so a 'stop' or a new job is noticed between slices.
const channel = new MessageChannel()
channel.port1.onmessage = step

function step() {
  if (!current) return
  const { id, worker, runner } = current
  const finished = runner.run(SLICE)
  const now = performance.now()
  if (finished || now - lastReport >= REPORT_EVERY) {
    lastReport = now
    const report: Report = { id, worker, done: runner.done, tally: runner.tally.slice() }
    postMessage(report, { transfer: [report.tally.buffer] })
  }
  if (finished) current = null
  else channel.port2.postMessage(0)
}

onmessage = (event: MessageEvent<Request>) => {
  const request = event.data
  if (request.type === 'stop') {
    current = null
    return
  }
  current = {
    id: request.id,
    worker: request.worker,
    runner: new JobRunner(request.job, request.worker, request.workers),
  }
  lastReport = performance.now()
  channel.port2.postMessage(0)
}

import { derive, type Input } from './history.ts'

const KEY = 'snapszer-solver/history'

/** The saved game, or an empty one if nothing usable is stored. */
export function loadHistory(): Input[] {
  try {
    const history = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Input[]
    derive(history)
    return history
  } catch {
    return []
  }
}

export function saveHistory(history: readonly Input[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {
    // Storage can be unavailable (private mode, quota); the game still works without it.
  }
}

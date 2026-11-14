import { type Input, settle } from './history.ts'

const KEY = 'snapszer-solver/history'

/** The saved game, or an empty one if nothing usable is stored. */
export function loadHistory(): Input[] {
  try {
    // Settling replays the inputs, which throws unless they describe a possible game.
    return settle(JSON.parse(localStorage.getItem(KEY) ?? '[]') as Input[])
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

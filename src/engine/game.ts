import { cardsOf, suitOf } from './cards.ts'
import { bonusChoice, bonusMask, choiceCard, followMask, isBonus } from './rules.ts'
import { Table } from './table.ts'

/** The choices open to a player holding `hand` at this point of the game. */
export function legalChoices(table: Table, hand: number): number[] {
  if (table.isOver) return []
  if (table.pendingBonus >= 0) return [table.pendingBonus]
  if (table.isLead) return [...cardsOf(hand), ...cardsOf(bonusMask(hand)).map(bonusChoice)]
  return cardsOf(followMask(hand, suitOf(table.trick[0]), table.trump, table.winningCard))
}

/** A game with every hand known. The reference the solver is checked against. */
export class Game {
  readonly table: Table
  readonly hands: number[]

  constructor(starter: number, adu: number, hands: number[], table?: Table) {
    this.table = table ?? new Table(starter, adu)
    this.hands = [...hands]
  }

  clone(): Game {
    return new Game(this.table.starter, this.table.adu, this.hands, this.table.clone())
  }

  legalChoices(): number[] {
    if (this.table.isOver) return []
    return legalChoices(this.table, this.hands[this.table.toMove])
  }

  apply(choice: number): void {
    if (!isBonus(choice)) this.hands[this.table.toMove] &= ~(1 << choiceCard(choice))
    this.table.apply(choice)
  }
}

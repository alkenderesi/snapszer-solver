import cardBack from '../assets/card-back.svg'
import acorns from '../assets/suits/acorns.svg'
import bells from '../assets/suits/bells.svg'
import hearts from '../assets/suits/hearts.svg'
import leaves from '../assets/suits/leaves.svg'
import { rankOf, suitOf } from '../engine/cards.ts'

// In card order: IX, Alsó, Felső, Király, X, Ász; piros, zöld, tök, makk.
const RANK_LABELS = ['IX', 'A', 'F', 'K', 'X', 'Á']
const SUIT_ICONS = [hearts, leaves, bells, acorns]

/** The rank and suit of a card; the surrounding element decides how they are laid out. */
export function Face({ card }: { card: number }) {
  return (
    <>
      <span className="rank">{RANK_LABELS[rankOf(card)]}</span>
      <img className="suit" src={SUIT_ICONS[suitOf(card)]} alt="" draggable={false} />
    </>
  )
}

export const CardBack = () => <img className="card-back" src={cardBack} alt="" draggable={false} />

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

export const Check = () => (
  <Icon>
    <path d="M4.5 12.5l5 5L19.5 6.5" />
  </Icon>
)

export const BackIcon = () => (
  <Icon>
    <path d="M10.5 5.5L4 12l6.5 6.5M4.5 12H20" />
  </Icon>
)

export const ResetIcon = () => (
  <Icon>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5v4.3h-4.3" />
  </Icon>
)

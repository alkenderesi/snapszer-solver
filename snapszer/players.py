"""Player related classes."""

from dataclasses import dataclass, field
from snapszer.cards import Card


@dataclass(repr=False, eq=False)
class Player:
    """A participant in a game of Snapszer."""

    hand: set[Card]

    score: int = field(default=0)
    bonus_score: int = field(default=0)

    next_player: "Player" = field(default=None)
    previous_player: "Player" = field(default=None)

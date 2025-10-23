"""Player-related classes"""

from dataclasses import dataclass, field

from schnapsen.cards import Card


@dataclass(repr=False, eq=False)
class Player:
    """Player in a game of Schnapsen"""

    name: str
    hand: set[Card]
    score: int = field(default=0)
    bonus_score: int = field(default=0)

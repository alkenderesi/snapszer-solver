"""Card-related classes and constants"""

from enum import Enum, IntEnum, auto
from dataclasses import dataclass


class Suit(Enum):
    """Suits of Hungarian-suited playing cards"""

    PIROS = auto()
    ZOLD = auto()
    TOK = auto()
    MAKK = auto()


class Rank(IntEnum):
    """Ranks of Hungarian-suited playing cards"""

    IX = 0
    ALSO = 2
    FELSO = 3
    KIRALY = 4
    X = 10
    ASZ = 11


@dataclass(frozen=True)
class Card:
    """Hungarian-suited playing card"""

    suit: Suit
    rank: Rank

    def __str__(self) -> str:
        return f"{self.suit.name} {self.rank.name}"

    def __hash__(self) -> int:
        return hash((self.suit, self.rank))

    @property
    def value(self) -> int:
        return self.rank.value


DECK = frozenset(Card(suit, rank) for suit in Suit for rank in Rank)
"""Complete Schnapsen deck with all 24 cards"""

"""Card-related classes and constants"""

from dataclasses import dataclass
from enum import Enum, IntEnum, auto


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

    @property
    def value(self) -> int:
        return self.rank.value


DECK = frozenset(Card(suit, rank) for suit in Suit for rank in Rank)
"""Complete Snapszer deck with all 24 cards"""

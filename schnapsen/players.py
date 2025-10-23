"""Player-related classes"""

from dataclasses import dataclass, field
from enum import Enum, auto

from schnapsen.cards import DECK, Card


class Position(Enum):
    """Player positions in the game"""

    P0 = auto()
    P1 = auto()
    P2 = auto()
    P3 = auto()


class Team(Enum):
    """Teams in the game"""

    TRUMP = auto()
    NON_TRUMP = auto()
    UNKNOWN = auto()


@dataclass
class Player:
    """Player in a 4-player Schnapsen game"""

    position: Position
    name: str
    hand: set[Card] = field(default_factory=set)
    possible_cards: frozenset[Card] = field(default_factory=lambda: DECK)
    score: int = field(default=0)
    team: Team = field(default=Team.UNKNOWN)

    def remove_possible_card(self, card: Card) -> None:
        """Remove a card from possible cards this player could hold"""
        self.possible_cards = frozenset(self.possible_cards - {card})

    def remove_possible_cards(self, cards: set[Card]) -> None:
        """Remove multiple cards from possible cards"""
        self.possible_cards = frozenset(self.possible_cards - cards)

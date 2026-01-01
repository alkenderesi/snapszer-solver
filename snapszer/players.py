"""Player-related classes and constants"""

from dataclasses import dataclass
from snapszer.cards import Card


@dataclass
class Player:
    """Player in a game of Snapszer"""

    name: str
    hand: set[Card]

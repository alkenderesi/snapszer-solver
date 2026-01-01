from dataclasses import dataclass
from snapszer.card import Card


@dataclass
class Player:
    name: str
    hand: set[Card]

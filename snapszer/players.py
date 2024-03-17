"""Player related classes."""

from typing import Iterator
from dataclasses import dataclass, field
from snapszer.cards import Card


@dataclass
class Score:
    """A player's score in a game of Snapszer."""

    value: int = 0
    history: dict[int, int] = field(default_factory=dict)

    def __str__(self) -> str:
        return str(self.value)

    def __add__(self, other: int) -> int:
        return self.value + other

    def add(self, value: int, event_id: int) -> None:
        if event_id in self.history:
            raise ValueError(f"Event '{event_id}' already added to history")
        self.history[event_id] = value
        self.value += value

    def undo(self, event_id: int) -> None:
        self.value -= self.history.pop(event_id, 0)


@dataclass
class Hand:
    """A player's hand in a game of Snapszer."""

    cards: set[Card]
    history: dict[int, set[Card]] = field(default_factory=dict)

    def __str__(self) -> str:
        return ", ".join(map(str, self.cards))

    def __len__(self) -> int:
        return len(self.cards)

    def __contains__(self, card: Card) -> bool:
        return card in self.cards

    def __iter__(self) -> Iterator[Card]:
        return iter(self.cards)

    def remove(self, cards: set[Card], event_id: int) -> None:
        if event_id in self.history:
            raise ValueError(f"Event '{event_id}' already added to history")
        self.history[event_id] = cards
        self.cards -= cards

    def undo(self, event_id: int) -> None:
        self.cards |= self.history.pop(event_id, set())


class Player:
    """A participant in a game of Snapszer."""

    pass

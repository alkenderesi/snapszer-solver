"""Card related classes and constants."""


class Card:
    """Class representing hungarian-suited playing cards."""

    VALUES = {"IX": 0, "ALSO": 2, "FELSO": 3, "KIRALY": 4, "X": 10, "ASZ": 11}
    SUITS = ("PIROS", "ZOLD", "TOK", "MAKK")
    RANKS = tuple(VALUES.keys())

    def __init__(self, suit: str, rank: str) -> None:
        if suit not in Card.SUITS:
            raise ValueError(
                f"Invalid suit: '{suit}'\nValid options: {', '.join(Card.SUITS)}"
            )

        if rank not in Card.RANKS:
            raise ValueError(
                f"Invalid rank: '{rank}'\nValid options: {', '.join(Card.RANKS)}"
            )

        self.suit = suit
        self.rank = rank

    def __str__(self) -> str:
        return f"{self.suit} {self.rank}"

    def __repr__(self) -> str:
        return f"Card(suit={self.suit}, rank={self.rank})"

    def __eq__(self, other: "Card") -> bool:
        return self.suit == other.suit and self.rank == other.rank

    def __hash__(self) -> int:
        return hash((self.suit, self.rank))

    @property
    def value(self) -> int:
        return Card.VALUES[self.rank]


DECK = tuple(Card(suit, rank) for suit in Card.SUITS for rank in Card.RANKS)
"""A complete Snapszer deck with all 24 cards."""

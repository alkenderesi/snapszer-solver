class Card:
    VALUES = {"IX": 0, "ALSO": 2, "FELSO": 3, "KIRALY": 4, "X": 10, "ASZ": 11}
    SUITS = frozenset({"PIROS", "ZOLD", "TOK", "MAKK"})
    RANKS = frozenset(VALUES.keys())

    def __init__(self, suit: str, rank: str) -> None:
        if suit not in Card.SUITS:
            raise ValueError(
                f"Invalid suit: '{suit}'\nValid options: {", ".join(Card.SUITS)}"
            )

        if rank not in Card.RANKS:
            raise ValueError(
                f"Invalid rank: '{rank}'\nValid options: {", ".join(Card.RANKS)}"
            )

        self._suit = suit
        self._rank = rank

    def __str__(self) -> str:
        return f"{self._suit} {self._rank}"

    def __repr__(self) -> str:
        return f"Card(suit={self._suit}, rank={self._rank})"

    def __eq__(self, other: "Card") -> bool:
        return self._suit == other._suit and self._rank == other._rank

    def __hash__(self) -> int:
        return hash((self._suit, self._rank))

    @property
    def suit(self):
        return self._suit

    @property
    def rank(self):
        return self._rank

    @property
    def value(self) -> int:
        return Card.VALUES[self._rank]

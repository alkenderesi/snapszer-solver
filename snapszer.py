class Card:
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


class Player:
    def __init__(self) -> None:
        self.points = 0
        self.bonus_points = 0
        self.hand: list[Card] = []

    def __str__(self) -> str:
        return (
            f"Player has {self.points} points, "
            f"{self.bonus_points} bonus points, "
            f"and {len(self.hand)} cards: {', '.join(self.hand)}"
        )

    def __repr__(self) -> str:
        return (
            f"Player(points={self.points}, "
            f"bonus_points={self.bonus_points}, "
            f"hand={self.hand})"
        )

    def __eq__(self, other: "Player") -> bool:
        return (
            self.points == other.points
            and self.bonus_points == other.bonus_points
            and self.hand == other.hand
        )

    def __hash__(self) -> int:
        return hash((self.points, self.bonus_points, tuple(self.hand)))


class Snapszer:
    DECK = tuple(Card(suit, rank) for suit in Card.SUITS for rank in Card.RANKS)

    def __init__(self, player_count: int) -> None:
        self.player_count = player_count
        self.round_count = len(Snapszer.DECK) // self.player_count
        self.trump_card: Card = None
        self.players = [Player() for _ in range(self.player_count)]
        self.card_history: list[list[Card]] = [[]]


class ThreePlayerSnapszer(Snapszer):
    def __init__(self) -> None:
        super().__init__(player_count=3)


class FourPlayerSnapszer(Snapszer):
    def __init__(self) -> None:
        super().__init__(player_count=4)

"""Snapszer module."""


class Card:
    SUITS = ("PIROS", "ZOLD", "TOK", "MAKK")
    VALUES = {"IX": 0, "ALSO": 2, "FELSO": 3, "KIRALY": 4, "X": 10, "ASZ": 11}
    RANKS = tuple(VALUES.keys())

    def __init__(self, suit: str, rank: str) -> None:
        self.suit = suit
        self.rank = rank

    def __str__(self) -> str:
        return f"{self.suit} {self.rank}"

    def __repr__(self) -> str:
        return f"Card(suit={self.suit}, rank={self.rank})"

    def __eq__(self, other: "Card") -> bool:
        return self.suit == other.suit and self.rank == other.rank

    @property
    def value(self) -> int:
        return Card.VALUES[self.rank]

    def beats(self, other: "Card", trump_card: "Card") -> bool:
        return (
            self.suit == other.suit
            and self.value > other.value
            or self.suit == trump_card.suit
            and other.suit != trump_card.suit
        )


class Player:
    def __init__(
        self, name: str, hand: list[Card], points: int, bonus_points: int
    ) -> None:
        self.name = name
        self.hand = hand
        self.points = points
        self.bonus_points = bonus_points

    def __str__(self) -> str:
        hand_str = ""
        for card in self.hand[:-1]:
            hand_str += f"{card}, "
        hand_str += f"{self.hand[-1]}"

        return (
            f"{self.name} has "
            f"{self.points} points, "
            f"{self.bonus_points} bonus points "
            f"and {len(self.hand)} cards: "
            f"{hand_str}"
        )

    def __repr__(self) -> str:
        return (
            f"Player(name={self.name}, "
            f"hand={self.hand}, "
            f"points={self.points}, "
            f"bonus_points={self.bonus_points})"
        )


class Snapszer:
    DECK = tuple(Card(suit, rank) for suit in Card.SUITS for rank in Card.RANKS)

    def __init__(
        self, players: list[Player], card_history: list[list[Card]], trump_card: Card
    ) -> None:
        self.players = players
        self.card_history = card_history
        self.trump_card = trump_card
        self.max_rounds = len(Snapszer.DECK) // len(self.players)

    def __str__(self) -> str:
        INDENTATION = " " * 4

        players_str = ""
        for player in self.players:
            players_str += f"{INDENTATION}{player}\n"

        card_history_str = ""
        for round_idx, round in enumerate(self.card_history):
            card_history_str += f"{INDENTATION}{round_idx+1}: [ "
            for card in round[:-1]:
                card_history_str += f"{card}, "
            card_history_str += f"{round[-1]} ]\n"

        return (
            f"Snapszer with {len(self.players)} players:\n{players_str}"
            f"Card history:\n{card_history_str}"
            f"Trump card: {self.trump_card}"
        )

    def __repr__(self) -> str:
        return (
            f"Snapszer(players={self.players}, "
            f"card_history={self.card_history}, "
            f"trump_card={self.trump_card})"
        )

    @property
    def current_round(self) -> list[Card]:
        return self.card_history[-1]

    @property
    def current_round_starting(self) -> bool:
        return len(self.current_round) == 0

    @property
    def current_round_over(self) -> bool:
        return len(self.current_round) == len(self.players)

    @property
    def current_player(self) -> Player:
        return self.players[len(self.current_round)]

    @property
    def called_card(self) -> Card:
        return self.current_round[0]

    def winning_card(self) -> Card:
        winning_card = self.called_card
        for card in self.current_round[1:]:
            if card.beats(winning_card, self.trump_card):
                winning_card = card
        return winning_card

    def winning_player(self, winning_card: Card) -> Player:
        return self.players[self.current_round.index(winning_card)]

    def playable_cards(self, winning_card: Card) -> tuple[Card]:
        # Case 1
        if self.current_round_starting:
            return tuple(self.current_player.hand)

        # Case 2
        if self.current_round_over:
            return tuple()

        # Case 3
        playable_cards = tuple(
            filter(
                lambda card: card.suit == self.called_card.suit,
                self.current_player.hand,
            )
        )
        higher_value_check = self.called_card.suit == winning_card.suit

        # Case 4
        if not playable_cards:
            playable_cards = tuple(
                filter(
                    lambda card: card.suit == self.trump_card.suit,
                    self.current_player.hand,
                )
            )
            higher_value_check = winning_card.suit == self.trump_card.suit

        # Case 5
        if not playable_cards:
            playable_cards = self.current_player.hand
            higher_value_check = False

        # Special case
        if higher_value_check:
            higher_value_cards = tuple(
                filter(
                    lambda card: card.value > winning_card.value,
                    playable_cards,
                )
            )
            if higher_value_cards:
                playable_cards = higher_value_cards

        return playable_cards

    def solve():
        pass

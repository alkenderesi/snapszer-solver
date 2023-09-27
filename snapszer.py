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
        self.update()

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
    def current_player(self) -> Player:
        return self.players[len(self.current_round)]

    def update(self):
        self._update_called_card()
        self._update_winning_card()
        self._update_winning_player()
        self._update_playable_cards()

    def _update_called_card(self) -> None:
        self.called_card = self.current_round[0] if self.current_round else None

    def _update_winning_card(self) -> None:
        self.winning_card = self.called_card
        for card in self.current_round[1:]:
            if card.beats(self.winning_card, self.trump_card):
                self.winning_card = card

    def _update_winning_player(self) -> None:
        self.winning_player = (
            self.players[self.current_round.index(self.winning_card)]
            if self.winning_card
            else None
        )

    def _update_playable_cards(self) -> None:
        # Case 1
        if len(self.current_round) == 0:
            self.playable_cards = self.current_player.hand
            return

        # Case 2
        if len(self.current_round) == len(self.players):
            self.playable_cards = []
            return

        # Case 3
        self.playable_cards = tuple(
            filter(
                lambda card: card.suit == self.called_card.suit,
                self.current_player.hand,
            )
        )
        higher_value_check = self.called_card.suit == self.winning_card.suit

        # Case 4
        if not self.playable_cards:
            self.playable_cards = tuple(
                filter(
                    lambda card: card.suit == self.trump_card.suit,
                    self.current_player.hand,
                )
            )
            higher_value_check = self.winning_card.suit == self.trump_card.suit

        # Case 5
        if not self.playable_cards:
            self.playable_cards = self.current_player.hand
            higher_value_check = False

        # Special case
        if higher_value_check:
            higher_value_cards = tuple(
                filter(
                    lambda card: card.value > self.winning_card.value,
                    self.playable_cards,
                )
            )
            if higher_value_cards:
                self.playable_cards = higher_value_cards

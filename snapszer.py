from copy import deepcopy
from typing import Union
import random


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


class Game:
    DECK = tuple(Card(suit, rank) for suit in Card.SUITS for rank in Card.RANKS)

    def __init__(
        self, players: list[Player], card_history: list[list[Card]], trump_card: Card
    ) -> None:
        self.players = players
        self.card_history = card_history
        self.trump_card = trump_card
        self.max_rounds = len(Game.DECK) // len(players)

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
            f"Game with {len(self.players)} players:\n{players_str}"
            f"Card history:\n{card_history_str}"
            f"Trump card: {self.trump_card}"
        )

    def __repr__(self) -> str:
        return (
            f"Game(players={self.players}, "
            f"card_history={self.card_history}, "
            f"trump_card={self.trump_card})"
        )

    @property
    def current_round(self) -> list[Card]:
        return self.card_history[-1]

    @property
    def current_player(self) -> Player:
        return self.players[len(self.current_round)]

    def called_card(self) -> Union[Card, None]:
        return self.current_round[0] if self.current_round else None

    def winning_card(self) -> Union[Card, None]:
        winning_card = self.called_card()
        for card in self.current_round[1:]:
            if card.beats(winning_card, self.trump_card):
                winning_card = card
        return winning_card

    def playable_cards(self) -> tuple[Card]:
        # Case 1
        if len(self.current_round) == 0:
            return self.current_player.hand

        # Case 2
        if len(self.current_round) == len(self.players):
            return []

        called_card = self.called_card()
        winnig_card = self.winning_card()

        # Case 3
        playable_cards = tuple(
            filter(
                lambda card: card.suit == called_card.suit,
                self.current_player.hand,
            )
        )
        higher_value_check = called_card.suit == winnig_card.suit

        # Case 4
        if not playable_cards:
            playable_cards = tuple(
                filter(
                    lambda card: card.suit == self.trump_card.suit,
                    self.current_player.hand,
                )
            )
            higher_value_check = winnig_card.suit == self.trump_card.suit

        # Case 5
        if not playable_cards:
            playable_cards = self.current_player.hand
            higher_value_check = False

        # Special case
        if higher_value_check:
            higher_value_cards = tuple(
                filter(
                    lambda card: card.value > winnig_card.value,
                    playable_cards,
                )
            )
            if higher_value_cards:
                playable_cards = higher_value_cards

        return playable_cards


# TODO:
# 1. Create a valid looking Game instance
# 2. Get the following info from the data:
# - Which player started the game? (player ref)
# - Which player is the winner of the current round? (player ref)
# - How many points did the winner of the current round gain? (int)
# - Has the trump card been played this game? (bool)
# - Which players belong to the trump card team? (player ref list)
# - What are the valid cards to play for the upcoming player? (card list)
# - What is the order of the players in the next round? (player ref list)


deck = list(Game.DECK)
random.shuffle(deck)

hand_1 = deck[0:5]
hand_2 = deck[5:10]
hand_3 = deck[10:15]
hand_4 = deck[15:21]

player_1 = Player(name="Player 1", hand=hand_1, points=0, bonus_points=0)
player_2 = Player(name="Player 2", hand=hand_2, points=0, bonus_points=0)
player_3 = Player(name="Player 3", hand=hand_3, points=0, bonus_points=0)
player_4 = Player(name="Player 4", hand=hand_4, points=0, bonus_points=0)

game = Game(
    players=[player_1, player_2, player_3, player_4],
    card_history=[
        [deck[-1], deck[-2], deck[-3]],
    ],
    trump_card=random.choice(deck),
)

print(game, "\n", sep="")
print("Playable:", game.playable_cards())

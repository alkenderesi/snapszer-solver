from copy import deepcopy


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
        if not isinstance(other, Card):
            raise TypeError(f"Cannot compare 'Card' to '{type(other)}'")
        return self.suit == other.suit and self.rank == other.rank

    @property
    def value(self) -> int:
        return Card.VALUES[self.rank]


class Player:
    def __init__(
        self, name: str, hand: list[Card], points: int, bonus_points: int
    ) -> None:
        self.name = name
        self.hand = hand
        self.points = points
        self.bonus_points = bonus_points

    def __str__(self) -> str:
        player_str = (
            f"{self.name} has "
            f"{self.points} points, "
            f"{self.bonus_points} bonus points "
            f"and {len(self.hand)} cards: "
        )
        for card in self.hand[:-1]:
            player_str += f"{card}, "
        player_str += f"{self.hand[-1]}"
        return player_str

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
        self.MAX_ROUNDS = len(Game.DECK) // len(players) # or max_rounds

    def __str__(self) -> str:
        INDENTATION = " " * 4
        game_str = f"Game with {len(self.players)} players:\n"
        for player in self.players:
            game_str += f"{INDENTATION}{player}\n"
        game_str += f"Card history:\n"
        for round_idx, round in enumerate(self.card_history):
            game_str += f"{INDENTATION}{round_idx+1}: [ "
            for card in round[:-1]:
                game_str += f"{card}, "
            game_str += f"{round[-1]} ]\n"
        game_str += f"Trump card: {self.trump_card}"
        return game_str

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

    def round_value_sum(self, round: list[Card]) -> int: # name might change, or just del
        pass

    def currently_playable_cards(self) -> list[Card]:
        pass


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


c = Card("PIROS", "ASZ")

p = Player("P1", [c, c], 0, 0)

g = Game([p], [[c, c], [c]], c)

# print(g)
# print([g])
# print(hash(g))

from snapszer.card import Card
from snapszer.player import Player


class Game:
    def __init__(self):
        self.you = Player("T", 1)
        self.opponents = [
            Player("B", 2),
            Player("P", 3),
            Player("A", 4),
        ]
        self.teammate: Player = None
        self.players = [self.you] + self.opponents
        self.player_count = len(self.players)
        self.trump_card: Card = None

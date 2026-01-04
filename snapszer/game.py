from snapszer.card import Card, DECK
from snapszer.player import Player


class Game:
    def __init__(self):
        self.you = Player("T", set())
        self.other_players = [
            Player("B", set(DECK)),
            Player("P", set(DECK)),
            Player("A", set(DECK)),
        ]
        self.players = [self.you] + self.other_players
        self.player_count = len(self.players)
        for i in range(self.player_count):
            self.players[i].next = self.players[(i+1) % self.player_count]
            self.players[i].previous = self.players[(i-1) % self.player_count]
        self.max_hand_size = len(DECK) // self.player_count
        self.starting_player: Player = None
        self.adu: Card = None

"""Game"""

from .cards import Card


class Game:
    def __init__(self):
        self.player_count: int = None
        self.trump_card: Card = None

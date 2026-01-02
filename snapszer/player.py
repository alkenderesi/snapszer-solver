from snapszer.card import Card


class Player:
    def __init__(self, name: str, starting_position: int):
        self.name = name
        self.starting_position = starting_position
        self.hand: set[Card] = set()

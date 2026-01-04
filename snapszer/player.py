from snapszer.card import Card, DECK


class Player:
    def __init__(self, name: str, hand: set[Card]):
        self.name = name
        self.hand = hand
        self.previous: Player = None
        self.next: Player = None
        self.score: int = 0

from snapszer.card import Card, DECK
from snapszer.game import Game


class Node:
    def __init__(self, previous: "Node"):
        self.previous = previous
        self.next: Node = None
        self.choices: list[Node] = []

    def activate(self):
        raise NotImplementedError

    def deactivate(self):
        raise NotImplementedError

    @property
    def game(self) -> Game:
        return self.previous.game

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}{self.choices}"


class Root(Node):
    def __init__(self):
        super().__init__(None)
        self._game = Game()

    def activate(self):
        self.choices.extend(Position(self, i+1) for i in range(self.game.player_count))
    
    def deactivate(self):
        self.choices.clear()

    @property
    def game(self) -> Game:
        return self._game


class Position(Node):
    def __init__(self, previous: Node, position: int):
        super().__init__(previous)
        self.position = position

    def activate(self):
        self.previous.next = self
        self.game.starting_position = self.position
        if self.game.starting_position == 1:
            self.choices.extend(CardDraw(self, card) for card in DECK)
        else:
            self.choices.extend(TrumpCard(self, card) for card in DECK)

    def deactivate(self):
        self.previous.next = None
        self.game.starting_position = None
        self.choices.clear()


class CardDraw(Node):
    def __init__(self, previous: Node, card: Card):
        super().__init__(previous)
        self.card = card


class TrumpCard(Node):
    def __init__(self, previous: Node, card: Card):
        super().__init__(previous)
        self.card = card

    def activate(self):
        self.previous.next = self
        self.game.trump_card = self.card
        if self.game.starting_position == 1:
            pass
        else:
            self.choices.extend(CardDraw(self, card) for card in DECK)

    def deactivate(self):
        self.previous.next = None
        self.game.trump_card = None
        self.choices.clear()


class CardPlay(Node):
    pass


class CardTrick(Node):
    pass

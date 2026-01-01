from snapszer.game import Game


class Node:
    def __init__(self, previous: "Node" | None):
        self.previous = previous
        self.next: Node | None = None
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
    def __init__(self, previous: Root, position: int):
        super().__init__(previous)
        self.position = position

class CardDraw(Node):
    pass

class TrumpCardChoice(Node):
    pass

class CardPlay(Node):
    pass

class CardTrick(Node):
    pass

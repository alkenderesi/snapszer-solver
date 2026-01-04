from __future__ import annotations
from snapszer.card import Card, DECK
from snapszer.player import Player
from snapszer.game import Game


class Node:
    choices: list[Node]

    def __init__(self, previous: Node):
        self.previous = previous
        self.next: Node = None
        self.choices = []

    def activate(self):
        raise NotImplementedError

    def deactivate(self):
        raise NotImplementedError

    @property
    def game(self) -> Game:
        return self.previous.game


class Root(Node):
    choices: list[StartingPlayer]

    def __init__(self):
        super().__init__(None)
        self._game = Game()

    def activate(self):
        self.choices = [StartingPlayer(self, player) for player in self.game.players]
    
    def deactivate(self):
        self.choices.clear()

    @property
    def game(self) -> Game:
        return self._game


class StartingPlayer(Node):
    choices: list[Draw | Adu]

    def __init__(self, previous: Node, player: Player):
        super().__init__(previous)
        self.player = player

    def activate(self):
        self.previous.next = self
        self.game.starting_player = self.player
        if self.player is self.game.you:
            self.choices = [Draw(self, card) for card in DECK]
        else:
            self.choices = [Adu(self, card) for card in DECK]

    def deactivate(self):
        self.previous.next = None
        self.game.starting_player = None
        self.choices.clear()


class Adu(Node):
    choices: list[Draw]

    def __init__(self, previous: Node, card: Card):
        super().__init__(previous)
        self.card = card

    def activate(self):
        self.previous.next = self
        self.game.adu = self.card
        self.choices = [Draw(self, card) for card in DECK - self.game.you.hand]

    def deactivate(self):
        self.previous.next = None
        self.game.adu = None
        self.choices.clear()


class Draw(Node):
    choices: list[Draw | Adu | Play]

    def __init__(self, previous: Node, card: Card):
        super().__init__(previous)
        self.card = card

    def activate(self):
        self.previous.next = self
        self.game.you.hand.add(self.card)
        for player in self.game.other_players:
            player.hand.remove(self.card)
        if len(self.game.you.hand) == self.game.max_hand_size:
            self.choices = [Play(self, self.game.starting_player, card) for card in self.game.starting_player.hand]
        elif self.game.starting_player is self.game.you and len(self.game.you.hand) == self.game.max_hand_size // 2:
            self.choices = [Adu(self, card) for card in DECK]
        else:
            self.choices = [Draw(self, card) for card in DECK - self.game.you.hand]

    def deactivate(self):
        self.previous.next = None
        self.game.you.hand.remove(self.card)
        for player in self.game.other_players:
            player.hand.add(self.card)
        self.choices.clear()


class Play(Node):
    choices: list[Play | Bonus]

    def __init__(self, previous: Node, player: Player, card: Card):
        super().__init__(previous)
        self.player = player
        self.card = card


class Bonus(Node):
    pass

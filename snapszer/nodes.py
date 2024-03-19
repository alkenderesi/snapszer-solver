"""Nodes for the game tree."""

from typing import Any
from copy import deepcopy
from snapszer.cards import Rank, Card, DECK
from snapszer.players import Player
from snapszer.game import Game
from snapszer.exceptions import IllegalStateError


class Node:
    def __init__(self, previous_node: "Node", value: Any = None):
        self.previous_node = previous_node
        self.value = value
        self.next_node: "Node" = None
        self.options: list["Node"] = []
        self.game: Game = None

    def __str__(self) -> str:
        return f"{self.__class__.__name__}({self.value})"

    @property
    def is_active(self) -> bool:
        return bool(self.options)

    @property
    def is_interlinked(self) -> bool:
        return bool(self.next_node)

    def activate(self):
        if self.is_active:
            raise IllegalStateError("Node is already active")
        self._link()
        self._copy_game()
        self._update_game()
        self._create_options()

    def deactivate(self):
        if not self.is_active:
            raise IllegalStateError("Node is already inactive")
        if self.is_interlinked:
            raise IllegalStateError("Node has an active next node")
        self._unlink()
        self._clear_options()

    def _link(self):
        self.previous_node.next_node = self

    def _unlink(self):
        self.previous_node.next_node = None

    def _copy_game(self):
        self.game = deepcopy(self.previous_node.game)

    def _update_game(self):
        raise NotImplementedError

    def _create_options(self):
        raise NotImplementedError

    def _clear_options(self):
        self.options.clear()


class Start(Node):
    def __init__(self):
        super().__init__(None)

    def _link(self):
        return

    def _unlink(self):
        return

    def _copy_game(self):
        self.game = Game()

    def _update_game(self):
        return

    def _create_options(self):
        self.options.extend(PlayerCount(self, player_count) for player_count in (3, 4))


class PlayerCount(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        self.game.player_count = self.value

        self.game.you = Player(set())
        self.game.opponents.extend(Player(DECK) for _ in range(self.value - 1))

        self.game.you.next_player = self.game.opponents[0]
        self.game.you.previous_player = self.game.opponents[-1]

        self.game.opponents[0].previous_player = self.game.you
        self.game.opponents[-1].next_player = self.game.you

        for i, opponent in enumerate(self.game.opponents):
            if not opponent.next_player:
                opponent.next_player = self.game.opponents[i + 1]
            if not opponent.previous_player:
                opponent.previous_player = self.game.opponents[i - 1]

    def _create_options(self):
        self.options.extend(Order(self, order) for order in range(1, self.value + 1))


class Order(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        return

    def _create_options(self):
        self.options.extend(Draw(self, card) for card in DECK)


class Draw(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        return

    def _create_options(self):
        remaining_cards = set(DECK)
        search_node = self

        while not isinstance(search_node, PlayerCount):
            if isinstance(search_node, Draw):
                remaining_cards.remove(search_node.value)
            search_node = search_node.previous_node

        player_count = search_node.value
        order = search_node.next_node.value
        starting_hand = DECK.difference(remaining_cards)
        full_hand_size = len(DECK) // player_count

        if len(starting_hand) == full_hand_size and order == 1:
            self.options.extend(
                (
                    BonusPlay(self, card)
                    if card.rank == Rank.FELSO
                    and Card(card.suit, Rank.KIRALY) in starting_hand
                    or card.rank == Rank.KIRALY
                    and Card(card.suit, Rank.FELSO) in starting_hand
                    else Play(self, card)
                )
                for card in starting_hand
            )

        elif (
            len(starting_hand) == full_hand_size
            or len(starting_hand) == full_hand_size // 2
            and order == 1
        ):
            self.options.extend(TrumpCard(self, card) for card in DECK)

        else:
            self.options.extend(Draw(self, card) for card in remaining_cards)


class TrumpCard(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        return

    def _create_options(self):
        remaining_cards = set(DECK)
        search_node = self

        while not isinstance(search_node, Order):
            if isinstance(search_node, Draw):
                remaining_cards.remove(search_node.value)
            search_node = search_node.previous_node

        order = search_node.value

        if order == 1:
            self.options.extend(Draw(self, card) for card in remaining_cards)

        else:
            self.options.extend(
                (
                    BonusPlay(self, card)
                    if card.rank == Rank.FELSO
                    and Card(card.suit, Rank.KIRALY) in remaining_cards
                    or card.rank == Rank.KIRALY
                    and Card(card.suit, Rank.FELSO) in remaining_cards
                    else Play(self, card)
                )
                for card in remaining_cards
            )


class Play(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)


class BonusPlay(Play):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)


class End(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _create_options(self):
        return

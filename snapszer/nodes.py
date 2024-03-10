"""Nodes for the game tree."""

from typing import Union, Any
from .cards import Card, DECK
from .game import Game
from .exceptions import IllegalStateError


class Node:
    def __init__(self, previous_node: "Node", value: Any = None):
        self.previous_node = previous_node
        self.value = value
        self.next_node: "Node" = None
        self.options: list["Node"] = []
        self.game = previous_node.game if previous_node else Game()

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
        self._update_game()
        self._create_options()

    def deactivate(self):
        if not self.is_active:
            raise IllegalStateError("Node is already inactive")
        if self.is_interlinked:
            raise IllegalStateError("Node has an active next node")
        self._unlink()
        self._revert_game()
        self._clear_options()

    def _link(self):
        self.previous_node.next_node = self

    def _unlink(self):
        self.previous_node.next_node = None

    def _update_game(self):
        return

    def _revert_game(self):
        return

    def _create_options(self):
        raise NotImplementedError

    def _clear_options(self):
        self.options.clear()


class Start(Node):
    def __init__(self):
        super().__init__(None, None)

    def _link(self):
        return

    def _unlink(self):
        return

    def _create_options(self):
        self.options.extend(PlayerCount(self, player_count) for player_count in (3, 4))


class PlayerCount(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        self.game.player_count = self.value

    def _revert_game(self):
        self.game.player_count = None

    def _create_options(self):
        self.options.extend(Order(self, order) for order in range(1, self.value + 1))


class Order(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _update_game(self):
        pass

    def _revert_game(self):
        self.game.order.clear()

    def _create_options(self):
        self.options.extend(Draw(self, card) for card in DECK)


class Draw(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _create_options(self):
        remaining_cards = set(DECK)
        starting_hand: set[Card] = set()
        search_node = self

        while not isinstance(search_node, PlayerCount):
            if isinstance(search_node, Draw):
                remaining_cards.remove(search_node.value)
                starting_hand.add(search_node.value)
            search_node = search_node.previous_node

        player_count = search_node.value
        order = search_node.next_node.value
        full_hand_size = len(DECK) // player_count

        if len(starting_hand) == full_hand_size:
            card_options = starting_hand if order == 1 else remaining_cards
            self.options.extend(Play(self, card) for card in card_options)
            self.options.extend(
                Bonus(self, suit)
                for suit in Card.SUITS
                if Card(suit, "FELSO") in card_options
                and Card(suit, "KIRALY") in card_options
            )

        elif len(starting_hand) == full_hand_size // 2:
            self.options.extend(TrumpCard(self, card) for card in DECK)

        else:
            self.options.extend(Draw(self, card) for card in remaining_cards)


class TrumpCard(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _create_options(self):
        remaining_cards = set(DECK)
        search_node = self.previous_node

        while isinstance(search_node, Draw):
            remaining_cards.remove(search_node.value)
            search_node = search_node.previous_node

        self.options.extend(Draw(self, card) for card in remaining_cards)


class Play(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)


class Bonus(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)


class End(Node):
    def __init__(self, previous_node, value):
        super().__init__(previous_node, value)

    def _create_options(self):
        return

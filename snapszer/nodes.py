"""Nodes for the game tree."""

from typing import Any, Union
from .cards import Card, DECK


class IllegalStateError(Exception):
    """
    Raised when an operation is attempted
    that is illegal in the current state of an object.
    """

    pass


class Node:
    previous_node: "Node"
    next_node: "Node"
    choices: list["Node"]
    value: Any

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.value})"

    def activate(self) -> None:
        if self.choices:
            raise IllegalStateError("Node is already active")
        self._link()
        self._create_choices()

    def deactivate(self) -> None:
        if not self.choices:
            raise IllegalStateError("Node is already inactive")
        if self.next_node:
            raise IllegalStateError("Node has an active next node")
        self._unlink()
        self._clear_choices()

    def _link(self) -> None:
        self.previous_node.next_node = self

    def _unlink(self) -> None:
        self.previous_node.next_node = None

    def _create_choices(self) -> None:
        raise NotImplementedError

    def _clear_choices(self) -> None:
        self.choices.clear()


class Start(Node):
    def __init__(self) -> None:
        self.previous_node: None = None
        self.next_node: PlayerCount = None
        self.choices: list[PlayerCount] = []
        self.value: None = None

    def _link(self) -> None:
        return

    def _unlink(self) -> None:
        return

    def _create_choices(self) -> None:
        self.choices.extend(PlayerCount(self, player_count) for player_count in (3, 4))


class PlayerCount(Node):
    def __init__(self, previous_node: Start, value: int) -> None:
        self.previous_node: Start = previous_node
        self.next_node: Order = None
        self.choices: list[Order] = []
        self.value: int = value

    def _create_choices(self) -> None:
        self.choices.extend(Order(self, order) for order in range(1, self.value + 1))


class Order(Node):
    def __init__(self, previous_node: PlayerCount, value: int) -> None:
        self.previous_node: PlayerCount = previous_node
        self.next_node: Draw = None
        self.choices: list[Draw] = []
        self.value: int = value

    def _create_choices(self) -> None:
        self.choices.extend(Draw(self, card) for card in DECK)


class Draw(Node):
    def __init__(
        self, previous_node: Union["Draw", "TrumpCard", Order], value: Card
    ) -> None:
        self.previous_node: Union[Draw, TrumpCard, Order] = previous_node
        self.next_node: Union[Draw, TrumpCard, Play, Bonus] = None
        self.choices: list[Union[Draw, TrumpCard, Play, Bonus]] = []
        self.value: Card = value

    def _create_choices(self) -> None:
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
            card_choices = starting_hand if order == 1 else remaining_cards
            self.choices.extend(Play(self, card) for card in card_choices)
            self.choices.extend(
                Bonus(self, suit)
                for suit in Card.SUITS
                if Card(suit, "FELSO") in card_choices
                and Card(suit, "KIRALY") in card_choices
            )

        elif len(starting_hand) == full_hand_size // 2:
            self.choices.extend(TrumpCard(self, card) for card in DECK)

        else:
            self.choices.extend(Draw(self, card) for card in remaining_cards)


class TrumpCard(Node):
    def __init__(self, previous_node: Draw, value: Card) -> None:
        self.previous_node: Draw = previous_node
        self.next_node: Draw = None
        self.choices: list[Draw] = []
        self.value: Card = value

    def _create_choices(self) -> None:
        remaining_cards = set(DECK)
        search_node = self.previous_node

        while isinstance(search_node, Draw):
            remaining_cards.remove(search_node.value)
            search_node = search_node.previous_node

        self.choices.extend(Draw(self, card) for card in remaining_cards)


class Play(Node):
    def __init__(self, previous_node, value: Card) -> None:
        self.previous_node = previous_node
        self.next_node = None
        self.choices = []
        self.value = value


class Bonus(Node):
    def __init__(self, previous_node, value: str) -> None:
        self.previous_node = previous_node
        self.next_node = None
        self.choices = []
        self.value = value

"""Nodes for the game tree."""

from typing import Any
from .cards import Card, DECK


class IllegalStateError(Exception):
    """
    Raised when an operation is attempted
    that is illegal in the current state of an object.
    """

    pass


class Node:
    def __init__(self, previous_node: "Node", value: Any = None) -> None:
        self.previous_node = previous_node
        self.next_node: Node = None
        self.choices: list[Node] = []
        self.value = value

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
            raise IllegalStateError("Node has a next node")
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

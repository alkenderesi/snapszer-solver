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
        raise NotImplementedError

    def deactivate(self) -> None:
        if self.is_active:
            raise IllegalStateError("Unable to deactivate node with active next node.")
        if not self.is_root:
            self.previous_node.next_node = None
        self.choices.clear()

    @property
    def is_active(self) -> bool:
        return self.next_node is not None

    @property
    def is_root(self) -> bool:
        return self.previous_node is None

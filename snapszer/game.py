"""Game related classes."""

from dataclasses import dataclass, field
from snapszer.players import Player


@dataclass(repr=False, eq=False)
class Game:
    """A game of Snapszer."""

    you: Player = None
    opponents: list[Player] = field(default_factory=list)

    current_player: Player = None

    trump_card_team: list[Player] = field(default_factory=list)
    non_trump_card_team: list[Player] = field(default_factory=list)

    trump_card_played: bool = False

    player_count: int = 0

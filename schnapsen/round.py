"""Round-related classes and logic"""

from dataclasses import dataclass, field

from schnapsen.cards import Card, Suit
from schnapsen.players import Position


@dataclass
class PlayedCard:
    """A card played by a player in a round"""

    player: Position
    card: Card


@dataclass
class Round:
    """A single round where all 4 players play one card"""

    plays: list[PlayedCard] = field(default_factory=list)
    trump_suit: Suit | None = None
    starting_player: Position | None = None

    def add_play(self, player: Position, card: Card) -> None:
        """Add a card play to the round"""
        self.plays.append(PlayedCard(player, card))

    def is_complete(self) -> bool:
        """Check if all 4 players have played"""
        return len(self.plays) == 4

    def get_winner(self) -> Position:
        """Determine the winner of the round"""
        if not self.is_complete():
            raise ValueError("Round is not complete")

        lead_suit = self.plays[0].card.suit
        trump_plays = [p for p in self.plays if p.card.suit == self.trump_suit]

        if trump_plays:
            winner = max(trump_plays, key=lambda p: p.card.rank.value)
        else:
            suit_plays = [p for p in self.plays if p.card.suit == lead_suit]
            winner = max(suit_plays, key=lambda p: p.card.rank.value)

        return winner.player

    def get_points(self) -> int:
        """Calculate total points in the round"""
        return sum(play.card.value for play in self.plays)

    def get_played_cards(self) -> list[Card]:
        """Get all cards played in this round"""
        return [play.card for play in self.plays]

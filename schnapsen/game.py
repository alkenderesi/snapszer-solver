"""Game state management"""

from dataclasses import dataclass, field

from schnapsen.cards import Card, Suit
from schnapsen.players import Player, Position, Team
from schnapsen.round import Round


@dataclass
class Game:
    """A complete 4-player Schnapsen game"""

    players: dict[Position, Player]
    trump_card: Card | None = None
    trump_suit: Suit | None = None
    starting_player: Position | None = None
    current_round: Round | None = None
    completed_rounds: list[Round] = field(default_factory=list)
    trump_card_holder: Position | None = None
    trump_card_revealed: bool = False

    def set_trump_card(self, card: Card) -> None:
        """Set the trump card and trump suit"""
        self.trump_card = card
        self.trump_suit = card.suit

    def set_starting_player(self, position: Position) -> None:
        """Set the starting player of the game"""
        self.starting_player = position

    def start_new_round(self, starting_player: Position) -> None:
        """Start a new round"""
        self.current_round = Round(
            trump_suit=self.trump_suit, starting_player=starting_player
        )

    def play_card(self, player: Position, card: Card) -> None:
        """Play a card in the current round"""
        if self.current_round is None:
            raise ValueError("No active round")

        self.current_round.add_play(player, card)
        self.players[player].hand.remove(card)

        if card == self.trump_card:
            self.trump_card_holder = player
            self.trump_card_revealed = True
            self._update_teams()

    def complete_round(self) -> Position:
        """Complete the current round and return the winner"""
        if self.current_round is None or not self.current_round.is_complete():
            raise ValueError("Round is not complete")

        winner = self.current_round.get_winner()
        points = self.current_round.get_points()
        self.players[winner].score += points

        self.completed_rounds.append(self.current_round)
        self.current_round = None

        return winner

    def is_game_complete(self) -> bool:
        """Check if all 6 rounds have been played"""
        return len(self.completed_rounds) == 6

    def get_winner(self) -> Position | None:
        """Get the winner of the game (highest score team)"""
        if not self.is_game_complete():
            return None

        max_score = max(player.score for player in self.players.values())
        winners = [
            pos for pos, player in self.players.items() if player.score == max_score
        ]

        return winners[0] if len(winners) == 1 else None

    def _update_teams(self) -> None:
        """Update team assignments when trump card holder is revealed"""
        if not self.trump_card_revealed or self.trump_card_holder is None:
            return

        if self.starting_player == self.trump_card_holder:
            self.players[self.starting_player].team = Team.TRUMP
            for pos in Position:
                if pos != self.starting_player:
                    self.players[pos].team = Team.NON_TRUMP
        else:
            self.players[self.starting_player].team = Team.TRUMP
            self.players[self.trump_card_holder].team = Team.TRUMP

            for pos in Position:
                if pos not in [self.starting_player, self.trump_card_holder]:
                    self.players[pos].team = Team.NON_TRUMP

    def get_team_score(self, team: Team) -> int:
        """Get the total score for a team"""
        return sum(
            player.score for player in self.players.values() if player.team == team
        )

    def eliminate_card_from_all(self, card: Card) -> None:
        """Remove a card from all players' possible cards"""
        for player in self.players.values():
            player.remove_possible_card(card)

    def is_team_certain(self) -> bool:
        """Check if team membership is now certain"""
        return self.trump_card_revealed

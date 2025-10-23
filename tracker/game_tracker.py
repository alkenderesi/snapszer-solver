"""Main game tracker logic"""

from schnapsen.cards import DECK, Card
from schnapsen.game import Game
from schnapsen.players import Player, Position, Team
from tracker.ui import UI


class GameTracker:
    """Tracks a 4-player Schnapsen game"""

    def __init__(self):
        self.ui = UI()
        self.game: Game | None = None
        self.user_position = Position.P0

    def run(self) -> None:
        """Run the game tracker"""
        print("\n" + "=" * 60)
        print("SCHNAPSEN GAME TRACKER")
        print("=" * 60)

        self._setup_game()
        self._setup_initial_cards()
        self._setup_trump()
        self._draw_remaining_cards()
        self._play_all_rounds()
        self._display_final_results()

    def _setup_game(self) -> None:
        """Initialize the game and players"""
        players = {
            Position.P0: Player(Position.P0, "You"),
            Position.P1: Player(Position.P1, "Player 1"),
            Position.P2: Player(Position.P2, "Player 2"),
            Position.P3: Player(Position.P3, "Player 3"),
        }

        self.game = Game(players=players)

        print("\nWho is the starting player?")
        starting_player = self.ui.prompt_position_selection("Starting player")
        self.game.set_starting_player(starting_player)

        if starting_player == self.user_position:
            self.ui.display_message("You are the starting player!")
        else:
            self.ui.display_message(
                f"{self.game.players[starting_player].name} is the starting player."
            )

    def _setup_initial_cards(self) -> None:
        """Draw initial 3 cards for the starting player"""
        starting_player_pos = self.game.starting_player

        if starting_player_pos == self.user_position:
            self.ui.display_message("Draw your first 3 cards:")
            for i in range(3):
                card = self.ui.prompt_card_selection(DECK, f"Card {i + 1}/3")
                self.game.players[self.user_position].hand.add(card)
                self._eliminate_card_globally(card)
        else:
            self.ui.display_message(
                f"{self.game.players[starting_player_pos].name} draws their first 3 cards (hidden)."
            )

    def _setup_trump(self) -> None:
        """Set up trump card"""
        starting_player_pos = self.game.starting_player
        user_hand = self.game.players[self.user_position].hand
        available_for_trump = (
            DECK - user_hand if starting_player_pos == self.user_position else DECK
        )

        if starting_player_pos == self.user_position:
            trump_card = self.ui.prompt_card_selection(
                frozenset(available_for_trump), "Declare trump card"
            )
        else:
            trump_card = self.ui.prompt_card_selection(
                DECK,
                f"{self.game.players[starting_player_pos].name} declares trump card",
            )

        self.game.set_trump_card(trump_card)
        self._eliminate_card_globally(trump_card)

        self.ui.display_message(f"Trump card: {trump_card}")
        self.ui.display_message(f"Trump suit: {trump_card.suit.name}")

        self.game.players[starting_player_pos].team = Team.TRUMP

    def _draw_remaining_cards(self) -> None:
        """Draw remaining 3 cards for starting player and all 6 for others"""
        starting_player_pos = self.game.starting_player

        if starting_player_pos == self.user_position:
            self.ui.display_message("Draw your remaining 3 cards:")
            for i in range(3):
                available = self._get_available_cards_for_user()
                card = self.ui.prompt_card_selection(available, f"Card {i + 4}/6")
                self.game.players[self.user_position].hand.add(card)
                self._eliminate_card_globally(card)
        else:
            self.ui.display_message("Draw your 6 cards:")
            for i in range(6):
                available = self._get_available_cards_for_user()
                card = self.ui.prompt_card_selection(available, f"Card {i + 1}/6")
                self.game.players[self.user_position].hand.add(card)
                self._eliminate_card_globally(card)

        for pos in [Position.P1, Position.P2, Position.P3]:
            if pos != starting_player_pos:
                self.ui.display_message(
                    f"{self.game.players[pos].name} draws 6 cards (hidden)."
                )

    def _play_all_rounds(self) -> None:
        """Play all 6 rounds of the game"""
        current_leader = self.game.starting_player

        for round_num in range(1, 7):
            self.ui.display_message(f"\n=== ROUND {round_num} ===")
            self.ui.display_message(f"{self.game.players[current_leader].name} leads.")

            self.game.start_new_round(current_leader)
            current_leader = self._play_round(current_leader)

            if self.game.is_team_certain() and round_num == 1:
                self._announce_teams()

    def _play_round(self, leader: Position) -> Position:
        """Play one round and return the winner"""
        play_order = self._get_play_order(leader)

        for player_pos in play_order:
            self.ui.display_game_state(
                self.game.players[self.user_position],
                self.game.players,
                self.game.trump_card,
                self.game.current_round.plays if self.game.current_round else None,
            )

            if player_pos == self.user_position:
                available = frozenset(self.game.players[self.user_position].hand)
                card = self.ui.prompt_card_selection(available, "Play your card")
            else:
                available = self.game.players[player_pos].possible_cards
                card = self.ui.prompt_card_selection(
                    available, f"{self.game.players[player_pos].name} plays"
                )

            self.game.play_card(player_pos, card)
            self._eliminate_card_globally(card)

            if self.game.trump_card_revealed and not self.game.is_team_certain():
                self._announce_teams()

        winner = self.game.complete_round()
        points = self.game.completed_rounds[-1].get_points()

        self.ui.display_message(
            f"{self.game.players[winner].name} wins the round! (+{points} points)"
        )

        return winner

    def _display_final_results(self) -> None:
        """Display final game results"""
        self.ui.display_game_state(
            self.game.players[self.user_position],
            self.game.players,
            self.game.trump_card,
        )

        trump_team_score = self.game.get_team_score(Team.TRUMP)
        non_trump_team_score = self.game.get_team_score(Team.NON_TRUMP)

        print("\n" + "=" * 60)
        print("FINAL SCORES")
        print("=" * 60)
        print(f"\nTRUMP Team: {trump_team_score} points")
        for pos, player in self.game.players.items():
            if player.team == Team.TRUMP:
                print(f"  - {pos.name}: {player.score} points")

        print(f"\nNON-TRUMP Team: {non_trump_team_score} points")
        for pos, player in self.game.players.items():
            if player.team == Team.NON_TRUMP:
                print(f"  - {pos.name}: {player.score} points")

        if trump_team_score > non_trump_team_score:
            print("\n>>> TRUMP Team wins!")
        elif non_trump_team_score > trump_team_score:
            print("\n>>> NON-TRUMP Team wins!")
        else:
            print("\n>>> It's a tie!")

        print("=" * 60)

    def _get_play_order(self, leader: Position) -> list[Position]:
        """Get the play order starting from leader (counterclockwise)"""
        positions = [Position.P0, Position.P1, Position.P2, Position.P3]
        leader_index = positions.index(leader)

        return [positions[(leader_index + i) % 4] for i in range(4)]

    def _get_available_cards_for_user(self) -> frozenset[Card]:
        """Get cards available for user to draw"""
        user_hand = self.game.players[self.user_position].hand
        return frozenset(DECK - user_hand - {self.game.trump_card})

    def _eliminate_card_globally(self, card: Card) -> None:
        """Remove card from all players' possible cards"""
        self.game.eliminate_card_from_all(card)

    def _announce_teams(self) -> None:
        """Announce team membership when it becomes certain"""
        if not self.game.trump_card_revealed:
            return

        trump_holder_pos = self.game.trump_card_holder
        starting_pos = self.game.starting_player

        if trump_holder_pos == starting_pos:
            self.ui.display_message(
                "🎴 The starting player has the trump card - it's 3v1!"
            )
        elif trump_holder_pos == self.user_position:
            self.ui.display_message(
                f"🎴 You have the trump card! You are teammates with {self.game.players[starting_pos].name}!"
            )
        elif starting_pos == self.user_position:
            self.ui.display_message(
                f"🎴 {self.game.players[trump_holder_pos].name} has the trump card - they are your teammate!"
            )
        else:
            self.ui.display_message(
                f"🎴 {self.game.players[trump_holder_pos].name} has the trump card!"
            )

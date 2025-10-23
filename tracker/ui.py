"""Console UI for the tracker"""

from schnapsen.cards import DECK, Card, Rank, Suit
from schnapsen.players import Player, Position, Team
from tracker.input_parser import InputParser

AVAILABLE_INDICATOR = "*"


class UI:
    """Console user interface for the tracker"""

    def __init__(self):
        self.parser = InputParser()

    def display_card_matrix(self, available_cards: frozenset[Card]) -> None:
        """Display the card selection matrix"""
        suits = [Suit.PIROS, Suit.ZOLD, Suit.TOK, Suit.MAKK]
        ranks = [Rank.IX, Rank.ALSO, Rank.FELSO, Rank.KIRALY, Rank.X, Rank.ASZ]

        rank_available = {
            rank: any(Card(suit, rank) in available_cards for suit in suits)
            for rank in ranks
        }
        suit_available = {
            suit: any(Card(suit, rank) in available_cards for rank in ranks)
            for suit in suits
        }

        header = "           "
        for rank in ranks:
            rank_label = f"{rank.name} {rank.value}"
            if rank_available[rank]:
                header += f"{rank_label:>8}"
            else:
                header += " " * 8

        print(header)

        for suit in suits:
            if suit_available[suit]:
                row = f"{suit.name:6} ({self.parser.get_suit_char(suit)})"
            else:
                row = " " * 11

            for rank in ranks:
                card = Card(suit, rank)
                if card in available_cards:
                    row += f"{AVAILABLE_INDICATOR:>8}"
                else:
                    row += " " * 8

            print(row)

    def prompt_card_selection(
        self, available_cards: frozenset[Card], prompt: str = "Select card"
    ) -> Card:
        """Prompt user to select a card from available cards"""
        while True:
            print(f"\n{prompt}:")
            self.display_card_matrix(available_cards)
            print()

            user_input = input("> ").strip()
            card = self.parser.parse_card(user_input)

            if card is None:
                print(
                    "Invalid input. Use format: <suit> <value> (e.g., 'p 0' for PIROS IX)"
                )
                continue

            if card not in available_cards:
                print("That card is not available.")
                continue

            return card

    def prompt_position_selection(self, prompt: str = "Select player") -> Position:
        """Prompt user to select a player position"""
        while True:
            print(f"\n{prompt} (p0, p1, p2, p3):")
            user_input = input("> ").strip()
            position = self.parser.parse_position(user_input)

            if position is None:
                print("Invalid input. Use: p0, p1, p2, or p3")
                continue

            return position

    def display_game_state(
        self,
        player: Player,
        all_players: dict[Position, Player],
        trump_card: Card | None,
        current_round_plays: list | None = None,
    ) -> None:
        """Display current game state"""
        print("\n" + "=" * 60)
        print("GAME STATE")
        print("=" * 60)

        if trump_card:
            print(f"\nTrump Card: {trump_card}")
            print(f"Trump Suit: {trump_card.suit.name}")

        print(f"\nYour Hand ({len(player.hand)} cards):")
        if player.hand:
            for card in sorted(player.hand, key=lambda c: (c.suit.value, c.rank.value)):
                print(f"  - {card}")
        else:
            print("  (empty)")

        print("\nScores:")
        for pos in [Position.P0, Position.P1, Position.P2, Position.P3]:
            p = all_players[pos]
            team_str = ""
            if p.team != Team.UNKNOWN:
                team_str = f" [{p.team.name}]"
            print(f"  {pos.name}: {p.score} points{team_str}")

        if current_round_plays:
            print("\nCurrent Round:")
            for play in current_round_plays:
                print(f"  {play.player.name}: {play.card}")

        print("=" * 60)

    def display_possible_cards(self, position: Position, player: Player) -> None:
        """Display possible cards for a player"""
        print(f"\n{position.name} possible cards ({len(player.possible_cards)} cards):")
        self.display_card_matrix(player.possible_cards)

    def display_message(self, message: str) -> None:
        """Display a message to the user"""
        print(f"\n>>> {message}")

    def display_winner(self, position: Position, score: int) -> None:
        """Display game winner"""
        print("\n" + "=" * 60)
        print("GAME OVER!")
        print("=" * 60)
        print(f"\nWinner: {position.name} with {score} points!")
        print("\n" + "=" * 60)

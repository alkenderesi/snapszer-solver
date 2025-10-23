"""Input parsing for the tracker"""

from schnapsen.cards import Card, Rank, Suit
from schnapsen.players import Position

SUIT_MAP = {
    "p": Suit.PIROS,
    "z": Suit.ZOLD,
    "t": Suit.TOK,
    "m": Suit.MAKK,
}

RANK_MAP = {
    "0": Rank.IX,
    "2": Rank.ALSO,
    "3": Rank.FELSO,
    "4": Rank.KIRALY,
    "10": Rank.X,
    "11": Rank.ASZ,
}

POSITION_MAP = {
    "p0": Position.P0,
    "p1": Position.P1,
    "p2": Position.P2,
    "p3": Position.P3,
}


class InputParser:
    """Parse user input for cards and players"""

    @staticmethod
    def parse_card(input_str: str) -> Card | None:
        """Parse card input in format 'p 0' or 'P 0'"""
        parts = input_str.strip().lower().split()

        if len(parts) != 2:
            return None

        suit_char, rank_value = parts

        suit = SUIT_MAP.get(suit_char)
        rank = RANK_MAP.get(rank_value)

        if suit is None or rank is None:
            return None

        return Card(suit, rank)

    @staticmethod
    def parse_position(input_str: str) -> Position | None:
        """Parse player position input like 'p0' or 'P0'"""
        return POSITION_MAP.get(input_str.strip().lower())

    @staticmethod
    def get_suit_char(suit: Suit) -> str:
        """Get the input character for a suit"""
        for char, s in SUIT_MAP.items():
            if s == suit:
                return char.upper()
        return "?"

    @staticmethod
    def get_rank_value(rank: Rank) -> str:
        """Get the input value for a rank"""
        for value, r in RANK_MAP.items():
            if r == rank:
                return value
        return "?"

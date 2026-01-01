"""Simulation nodes"""


class Node:
    """Base node"""

class Game(Node):
    """Game root"""
    # player data, trump card

class Position(Node):
    """Player starting position"""

class CardDraw(Node):
    """Card draw"""

class TrumpCardChoice(Node):
    """Trump card"""

class CardPlay(Node):
    """Card play"""

class CardTrick(Node):
    """Card trick"""
    # 20, 40, 0

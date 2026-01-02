from unittest import TestCase
from snapszer.card import Card, Suit, Rank


class TestCard(TestCase):
    def test_card_equality(self):
        card1 = Card(Suit.PIROS, Rank.ASZ)
        card2 = Card(Suit.PIROS, Rank.ASZ)
        card3 = Card(Suit.ZOLD, Rank.ASZ)
        self.assertIsNot(card1, card2)
        self.assertEqual(card1, card2)
        self.assertNotEqual(card1, card3)

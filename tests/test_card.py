from unittest import TestCase
from snapszer.card import Card, Suit, Rank, DECK


class TestCard(TestCase):
    def test_card_equality(self):
        card1 = Card(Suit.PIROS, Rank.ASZ)
        card2 = Card(Suit.PIROS, Rank.ASZ)
        self.assertIsNot(card1, card2)
        self.assertEqual(card1, card2)


class TestDeck(TestCase):
    def test_deck_size(self):
        self.assertEqual(len(DECK), 24)

    def test_deck_subtraction(self):
        hand = set()
        hand.add(Card(Suit.PIROS, Rank.ASZ))
        diff = DECK - hand
        self.assertIsInstance(diff, frozenset)
        self.assertEqual(len(diff), 23)

from unittest import TestCase
from snapszer.card import Card, Suit, Rank,DECK
from snapszer.nodes import Root, StartingPlayer, Draw, Adu, Play


class TestRoot(TestCase):
    def test_activate(self):
        root = Root()
        root.activate()
        for choice, player in zip(root.choices, root.game.players):
            self.assertIsInstance(choice, StartingPlayer)
            self.assertIs(choice.player, player)

    def test_deactivate(self):
        root = Root()
        root.activate()
        root.deactivate()
        self.assertEqual(root.choices, [])


class TestStartingPlayer(TestCase):
    def test_activate_you(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        self.assertIs(root.game.starting_player, starting_player.player)
        self.assertEqual(len(starting_player.choices), len(DECK))
        for choice in starting_player.choices:
            self.assertIsInstance(choice, Draw)
            self.assertIn(choice.card, DECK)

    def test_activate_other_player(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is not root.game.you)
        starting_player.activate()
        self.assertIs(root.game.starting_player, starting_player.player)
        self.assertEqual(len(starting_player.choices), len(DECK))
        for choice in starting_player.choices:
            self.assertIsInstance(choice, Adu)
            self.assertIn(choice.card, DECK)

    def test_deactivate(self):
        root = Root()
        root.activate()
        starting_player = root.choices[0]
        starting_player.activate()
        starting_player.deactivate()
        self.assertIsNone(root.game.starting_player)
        self.assertEqual(starting_player.choices, [])


class TestAdu(TestCase):
    def test_activate_you(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        current = starting_player
        for card in (Card(Suit.PIROS, Rank.ASZ), Card(Suit.PIROS, Rank.X), Card(Suit.PIROS, Rank.KIRALY)):
            current: Draw = next(choice for choice in current.choices if choice.card == card)
            current.activate()
        draw = current
        adu: Adu = next(choice for choice in draw.choices if choice.card == Card(Suit.PIROS, Rank.ASZ))
        adu.activate()
        self.assertEqual(root.game.adu, Card(Suit.PIROS, Rank.ASZ))
        self.assertEqual(len(adu.choices), len(DECK - root.game.you.hand))
        for choice in adu.choices:
            self.assertIsInstance(choice, Draw)
            self.assertIn(choice.card, DECK - root.game.you.hand)

    def test_activate_other_player(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is not root.game.you)
        starting_player.activate()
        adu: Adu = next(choice for choice in starting_player.choices if choice.card == Card(Suit.PIROS, Rank.ASZ))
        adu.activate()
        self.assertEqual(root.game.adu, Card(Suit.PIROS, Rank.ASZ))
        self.assertEqual(len(adu.choices), len(DECK))
        for choice in adu.choices:
            self.assertIsInstance(choice, Draw)
            self.assertIn(choice.card, DECK)

    def test_deactivate(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is not root.game.you)
        starting_player.activate()
        adu: Adu = next(choice for choice in starting_player.choices if choice.card == Card(Suit.PIROS, Rank.ASZ))
        adu.activate()
        adu.deactivate()
        self.assertIsNone(root.game.adu)
        self.assertEqual(adu.choices, [])


class TestDraw(TestCase):
    def test_activate_empty_hand(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        draw: Draw = next(choice for choice in starting_player.choices if choice.card == Card(Suit.PIROS, Rank.ASZ))
        draw.activate()
        self.assertEqual(root.game.you.hand, {Card(Suit.PIROS, Rank.ASZ)})
        for player in root.game.other_players:
            self.assertNotIn(Card(Suit.PIROS, Rank.ASZ), player.hand)
        self.assertEqual(len(draw.choices), len(DECK - root.game.you.hand))
        for choice in draw.choices:
            self.assertIsInstance(choice, Draw)
            self.assertIn(choice.card, DECK - root.game.you.hand)

    def test_activate_half_hand(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        cards = {Card(Suit.PIROS, Rank.ASZ), Card(Suit.PIROS, Rank.X), Card(Suit.PIROS, Rank.KIRALY)}
        current = starting_player
        for card in cards:
            current: Draw = next(choice for choice in current.choices if choice.card == card)
            current.activate()
        self.assertEqual(root.game.you.hand, cards)
        self.assertEqual(len(current.choices), len(DECK))
        for choice in current.choices:
            self.assertIsInstance(choice, Adu)
            self.assertIn(choice.card, DECK)

    def test_activate_full_hand(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        first_cards = {Card(Suit.PIROS, Rank.ASZ), Card(Suit.PIROS, Rank.X), Card(Suit.PIROS, Rank.KIRALY)}
        current = starting_player
        for card in first_cards:
            current: Draw = next(choice for choice in current.choices if choice.card == card)
            current.activate()
        adu: Adu = next(choice for choice in current.choices if choice.card == Card(Suit.MAKK, Rank.ALSO))
        adu.activate()
        last_cards = {Card(Suit.ZOLD, Rank.ASZ), Card(Suit.ZOLD, Rank.X), Card(Suit.ZOLD, Rank.KIRALY)}
        current = adu
        for card in last_cards:
            current: Draw = next(choice for choice in current.choices if choice.card == card)
            current.activate()
        self.assertEqual(root.game.you.hand, first_cards | last_cards)
        self.assertEqual(len(current.choices), len(root.game.starting_player.hand))
        for choice in current.choices:
            self.assertIsInstance(choice, Play)
            self.assertIn(choice.card, root.game.starting_player.hand)
            self.assertIs(choice.player, root.game.starting_player)

    def test_deactivate(self):
        root = Root()
        root.activate()
        starting_player = next(choice for choice in root.choices if choice.player is root.game.you)
        starting_player.activate()
        draw: Draw = next(choice for choice in starting_player.choices if choice.card == Card(Suit.PIROS, Rank.ASZ))
        draw.activate()
        draw.deactivate()
        self.assertEqual(root.game.you.hand, set())
        for player in root.game.other_players:
            self.assertIn(Card(Suit.PIROS, Rank.ASZ), player.hand)
        self.assertEqual(draw.choices, [])

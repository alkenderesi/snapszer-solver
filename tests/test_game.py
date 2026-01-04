from unittest import TestCase
from snapszer.game import Game


class TestGame(TestCase):
    def test_player_links(self):
        game = Game()
        current = game.players[0]
        visited = []
        for _ in range(game.player_count):
            visited.append(current)
            current = current.next
        self.assertEqual(len(set(visited)), game.player_count)
        self.assertIs(current, game.players[0])
        for player in game.players:
            self.assertIs(player.next.previous, player)
            self.assertIs(player.previous.next, player)

"""Generate random games from the reference Python library as test fixtures.

Usage (Python 3.14, from the repo root):
    PYTHONPATH=~/Projects/snapszer python3.14 tools/gen_fixtures.py > tests/fixtures/games.json

Seats are 0..3 in turn order. Cards are suit * 6 + rank in the library's own
suit and rank order. A choice is the card index, plus 24 for an announcement.
Each decision is [seat, chosen, *legal].
"""

import json
import random
import sys

from snapszer import DECK, Card, Player, Rank, Snapszer, Suit
from snapszer.nodes import Bonus, Play

SUITS = list(Suit)
RANKS = list(Rank)
GAMES = 400
SEED = 20261113


def index(card: Card) -> int:
    return SUITS.index(card.suit) * len(RANKS) + RANKS.index(card.rank)


def choice_id(node: Play | Bonus) -> int:
    return index(node.card) + (24 if isinstance(node, Bonus) else 0)


def mask(cards: set[Card]) -> int:
    return sum(1 << index(card) for card in cards)


def play_game(rng: random.Random) -> dict:
    cards = sorted(DECK, key=index)
    rng.shuffle(cards)
    seats = [Player(str(seat), set(cards[seat * 6 : seat * 6 + 6])) for seat in range(4)]
    starter = rng.randrange(4)
    adu = rng.choice(cards)
    hands = [mask(player.hand) for player in seats]
    node = Snapszer(adu, seats[starter:] + seats[:starter])
    decisions = []
    while True:
        node.activate()
        if not node.choices:
            break
        if isinstance(node.choices[0], Play | Bonus):
            chosen = rng.choice(node.choices)
            legal = sorted(choice_id(choice) for choice in node.choices)
            decisions.append([int(chosen.player.name), choice_id(chosen), *legal])
            node = chosen
        else:
            (node,) = node.choices
    return {
        "starter": starter,
        "adu": index(adu),
        "hands": hands,
        "decisions": decisions,
        "outcome": [node.game.outcome[player] for player in seats],
        "score": [player.score for player in seats],
        "bonus": [player.bonus_score for player in seats],
    }


def main() -> None:
    rng = random.Random(SEED)
    games = [play_game(rng) for _ in range(GAMES)]
    sys.stdout.write("[\n" + ",\n".join(json.dumps(game, separators=(",", ":")) for game in games) + "\n]\n")


if __name__ == "__main__":
    main()

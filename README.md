# schnapsen-python

A 4-player team Schnapsen card game tracker in Python.

This is a recreational hobby project for tracking physical Schnapsen games.

The project uses Python 3.13.

## Project Structure

- **schnapsen/** - Reusable game library
  - Core game logic: cards, players, rounds, game state
  - Generic and reusable for other projects
  
- **tracker/** - Interactive console tracker application
  - Tracks physical games as they are played
  - Records cards, scores, and possible opponent hands
  - Detects team membership as game progresses

## Usage

Run the tracker:

```bash
python -m tracker.main
```

The tracker will guide you through:
1. Setting up the game (who is starting player)
2. Drawing cards
3. Trump card declaration
4. Playing all 6 rounds
5. Final score calculation

## Card Input Format

Cards are input using a matrix display with format: `<suit> <value>`

Example: `p 11` for PIROS ASZ, `z 0` for ZOLD IX

- Suits: `p` (PIROS), `z` (ZOLD), `t` (TOK), `m` (MAKK)
- Values: `0` (IX), `2` (ALSO), `3` (FELSO), `4` (KIRALY), `10` (X), `11` (ASZ)

## Guidelines

* No third-party packages for the Schnapsen implementation
* Use built-in Python features in their intended ways
* Keep the code minimalist
* Follow Python best practices
* No comments in the source code, the code should explain itself

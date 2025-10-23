"""Main entry point for the Schnapsen tracker"""

from tracker.game_tracker import GameTracker


def main() -> None:
    """Run the Schnapsen game tracker"""
    tracker = GameTracker()
    try:
        tracker.run()
    except KeyboardInterrupt:
        print("\n\nGame tracker interrupted. Goodbye!")
    except Exception as e:
        print(f"\n\nAn error occurred: {e}")
        raise


if __name__ == "__main__":
    main()

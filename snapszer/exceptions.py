"""Custom exceptions for the snapszer package."""


class IllegalStateError(Exception):
    """
    Raised when an operation is attempted
    that is illegal in the current state of an object.
    """

    pass

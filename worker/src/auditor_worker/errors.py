"""Custom exceptions for the skill auditor worker."""


class ConfigError(Exception):
    """Raised when configuration is missing or invalid."""


class TransientError(Exception):
    """Temporary failure that can be retried."""


class AnalysisFailure(Exception):
    """Permanent analysis failure that cannot be retried.

    The reason will be stored as the user-facing failureReason on the job.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason

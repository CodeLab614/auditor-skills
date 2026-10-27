"""Entrypoint for the skill auditor worker."""

import logging
import signal
import sys
import threading

import psycopg

from auditor_worker import pipeline
from auditor_worker.config import Config, load_config
from auditor_worker.db import ClaimedJob, claim_job, fail_job, requeue_job
from auditor_worker.errors import AnalysisFailure, TransientError

logger = logging.getLogger("auditor_worker")


def setup_logging() -> None:
    """Configure logging to stderr without exposing sensitive credentials."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stderr,
    )


def handle_claimed_job(
    conn: psycopg.Connection,
    job: ClaimedJob,
    config: Config,
    deps: pipeline.PipelineDeps | None = None,
) -> None:
    """Process a single claimed job with attempt checking and error handling."""
    if job.attempts > config.max_attempts:
        logger.warning("Job %s exceeded max attempts (%s/%s)", job.id, job.attempts, config.max_attempts)
        fail_job(conn, job.id, "Se agotaron los intentos")
        return

    active_deps = deps if deps is not None else pipeline.default_deps(config)

    try:
        pipeline.run_job(conn, job, active_deps)
        logger.info("Job %s finished successfully", job.id)
    except TransientError as err:
        logger.warning("Transient error on job %s: %s", job.id, err)
        if job.attempts < config.max_attempts:
            requeue_job(conn, job.id)
        else:
            fail_job(conn, job.id, "Se agotaron los intentos")
    except AnalysisFailure as err:
        logger.warning("Analysis failure on job %s: %s", job.id, err.reason)
        fail_job(conn, job.id, err.reason)
    except Exception:
        logger.exception("Unexpected internal error processing job %s", job.id)
        fail_job(conn, job.id, "Error interno del análisis")


def run_worker_loop(config: Config, stop_event: threading.Event) -> None:
    """Run worker polling loop with reconnect on OperationalError and clean signal handling."""
    deps = pipeline.default_deps(config)
    while not stop_event.is_set():
        try:
            logger.info("Connecting to database...")
            with psycopg.connect(config.database_url, autocommit=True) as conn:
                logger.info("Connected to database. Starting polling loop.")
                while not stop_event.is_set():
                    job = claim_job(conn, stale_after_seconds=config.stale_after_seconds)

                    if job is None:
                        stop_event.wait(config.poll_seconds)
                        continue

                    logger.info("Claimed job %s (kind=%s, attempt=%s)", job.id, job.kind, job.attempts)
                    handle_claimed_job(conn, job, config, deps)
        except psycopg.OperationalError as err:
            if stop_event.is_set():
                break
            logger.error("Database connection lost: %s. Reconnecting in %s seconds...", err, config.poll_seconds)
            stop_event.wait(config.poll_seconds)


def main() -> int:
    """Initialize configuration, signals, and execute worker loop."""
    setup_logging()
    config = load_config()

    stop_event = threading.Event()

    def _on_signal(signum: int, _frame: object) -> None:
        logger.info("Received termination signal (%s), shutting down cleanly...", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, _on_signal)
    signal.signal(signal.SIGINT, _on_signal)

    logger.info("Auditor worker started (poll=%ss, max_attempts=%s)", config.poll_seconds, config.max_attempts)
    run_worker_loop(config, stop_event)
    logger.info("Auditor worker stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

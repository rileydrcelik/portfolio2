"""The rules behind the now-playing card, kept free of the database and FastAPI
so they can be tested on their own.

The phone reports a state when it changes and once a minute while playing.
Whether that state is still true is decided here, when the site asks -- a
phone that died mid-song never sends "stopped", so "playing" has to expire.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

# The phone heartbeats every 60 s while playing. Past this with no word, the
# song is taken to have stopped: the phone died, lost signal or was killed.
HEARTBEAT_GRACE = timedelta(seconds=150)

# A pause reads as "Paused" for this long, then as "Last played".
PAUSED_FRESH = timedelta(minutes=10)


@dataclass(frozen=True)
class Stored:
    state: str  # 'playing' | 'paused' | 'stopped' | 'hidden'
    has_track: bool
    position_s: float
    position_at: datetime
    last_heartbeat_at: datetime
    duration_s: Optional[float]


@dataclass(frozen=True)
class Effective:
    state: str  # 'playing' | 'paused' | 'idle' | 'hidden'
    # The latest moment the song could have been heard; None while playing.
    last_active_at: Optional[datetime]


def effective_state(row: Optional[Stored], now: datetime) -> Effective:
    """What the card should say about the stored state, at `now`."""
    if row is None or (not row.has_track and row.state != "hidden"):
        return Effective("idle", None)
    if row.state == "hidden":
        return Effective("hidden", None)
    if row.state == "playing":
        if now - row.last_heartbeat_at <= HEARTBEAT_GRACE:
            return Effective("playing", None)
        # Stale. The song ended no later than its own end, and no later than
        # the last time the phone was heard from.
        ended = row.last_heartbeat_at
        if row.duration_s:
            song_end = row.position_at + timedelta(seconds=max(0.0, row.duration_s - row.position_s))
            ended = min(ended, song_end)
        return Effective("idle", ended)
    if row.state == "paused" and now - row.position_at <= PAUSED_FRESH:
        return Effective("paused", row.position_at)
    return Effective("idle", row.position_at)


def accepts(
    stored_session: Optional[str],
    stored_counter: Optional[int],
    stored_observed_at: Optional[datetime],
    session: str,
    counter: int,
    observed_at: datetime,
) -> bool:
    """Whether a snapshot is newer than the one stored.

    Within one app launch the counter decides, which needs no clock. Across
    launches it is when each was observed, on the server's clock -- so a retry
    from a previous launch that arrives late cannot undo the current one.
    """
    if stored_session is None:
        return True
    if session == stored_session:
        return counter > (stored_counter or 0)
    return stored_observed_at is None or observed_at >= stored_observed_at

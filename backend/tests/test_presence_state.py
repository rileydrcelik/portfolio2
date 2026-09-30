import unittest
from datetime import datetime, timedelta

from app.lib.presence_state import Stored, accepts, effective_state

T0 = datetime(2026, 1, 1, 12, 0, 0)


def row(state="playing", has_track=True, position_s=0.0, position_at=T0,
        last_heartbeat_at=T0, duration_s=None):
    return Stored(state, has_track, position_s, position_at, last_heartbeat_at, duration_s)


class EffectiveStateTests(unittest.TestCase):
    def test_no_row_is_idle(self):
        e = effective_state(None, T0)
        self.assertEqual((e.state, e.last_active_at), ("idle", None))

    def test_no_track_is_idle_unless_hidden(self):
        self.assertEqual(effective_state(row(has_track=False), T0).state, "idle")
        self.assertEqual(effective_state(row(state="hidden", has_track=False), T0).state, "hidden")

    def test_hidden(self):
        e = effective_state(row(state="hidden"), T0 + timedelta(days=1))
        self.assertEqual((e.state, e.last_active_at), ("hidden", None))

    def test_playing_fresh_at_exact_boundary(self):
        e = effective_state(row(), T0 + timedelta(seconds=150))
        self.assertEqual((e.state, e.last_active_at), ("playing", None))

    def test_playing_freshness_counts_from_the_heartbeat_not_the_position(self):
        # position_at is old (a seek long ago) but the phone was heard from 100 s ago.
        r = row(position_at=T0, last_heartbeat_at=T0 + timedelta(minutes=30))
        e = effective_state(r, T0 + timedelta(minutes=30, seconds=100))
        self.assertEqual((e.state, e.last_active_at), ("playing", None))
        # and a recent seek does not keep a silent phone "playing"
        r = row(position_at=T0 + timedelta(minutes=30), last_heartbeat_at=T0)
        self.assertEqual(effective_state(r, T0 + timedelta(minutes=30, seconds=1)).state, "idle")

    def test_playing_just_past_boundary_is_idle(self):
        e = effective_state(row(), T0 + timedelta(seconds=150, microseconds=1))
        self.assertEqual(e.state, "idle")

    def test_stale_playing_without_duration_ends_at_last_heartbeat(self):
        e = effective_state(row(last_heartbeat_at=T0 + timedelta(seconds=60)), T0 + timedelta(hours=1))
        self.assertEqual(e.last_active_at, T0 + timedelta(seconds=60))

    def test_stale_playing_song_ended_before_last_heartbeat(self):
        # 100 s left at position_at, heartbeat 300 s later: the song ended first.
        r = row(position_s=100, duration_s=200, last_heartbeat_at=T0 + timedelta(seconds=300))
        e = effective_state(r, T0 + timedelta(hours=1))
        self.assertEqual((e.state, e.last_active_at), ("idle", T0 + timedelta(seconds=100)))

    def test_stale_playing_heartbeat_before_song_end(self):
        r = row(position_s=0, duration_s=1000, last_heartbeat_at=T0 + timedelta(seconds=60))
        e = effective_state(r, T0 + timedelta(hours=1))
        self.assertEqual(e.last_active_at, T0 + timedelta(seconds=60))

    def test_position_past_duration_does_not_go_back_in_time(self):
        r = row(position_s=500, duration_s=200, last_heartbeat_at=T0 + timedelta(seconds=30))
        e = effective_state(r, T0 + timedelta(hours=1))
        self.assertEqual(e.last_active_at, T0)

    def test_paused_fresh_within_ten_minutes(self):
        e = effective_state(row(state="paused"), T0 + timedelta(minutes=10))
        self.assertEqual((e.state, e.last_active_at), ("paused", T0))

    def test_paused_expires_to_idle_keeping_position_at(self):
        e = effective_state(row(state="paused"), T0 + timedelta(minutes=10, seconds=1))
        self.assertEqual((e.state, e.last_active_at), ("idle", T0))

    def test_paused_uses_position_at_not_heartbeat(self):
        r = row(state="paused", last_heartbeat_at=T0 + timedelta(minutes=30))
        self.assertEqual(effective_state(r, T0 + timedelta(minutes=31)).state, "idle")

    def test_stopped_is_idle_at_position_at(self):
        e = effective_state(row(state="stopped"), T0 + timedelta(seconds=5))
        self.assertEqual((e.state, e.last_active_at), ("idle", T0))


class AcceptsTests(unittest.TestCase):
    def test_first_snapshot(self):
        self.assertTrue(accepts(None, None, None, "s", 1, T0))

    def test_same_session_newer_counter(self):
        self.assertTrue(accepts("s", 4, T0, "s", 5, T0 - timedelta(days=1)))

    def test_same_session_equal_or_older_counter_rejected(self):
        self.assertFalse(accepts("s", 4, T0, "s", 4, T0 + timedelta(days=1)))
        self.assertFalse(accepts("s", 4, T0, "s", 3, T0 + timedelta(days=1)))

    def test_same_session_missing_stored_counter_counts_as_zero(self):
        self.assertTrue(accepts("s", None, T0, "s", 1, T0))
        self.assertFalse(accepts("s", None, T0, "s", 0, T0))

    def test_different_session_decided_by_time_not_counter(self):
        self.assertTrue(accepts("old", 99, T0, "new", 1, T0 + timedelta(seconds=1)))
        self.assertFalse(accepts("old", 1, T0, "new", 99, T0 - timedelta(seconds=1)))

    def test_different_session_equal_time_accepted(self):
        self.assertTrue(accepts("old", 1, T0, "new", 1, T0))

    def test_different_session_no_stored_time_accepted(self):
        self.assertTrue(accepts("old", 1, None, "new", 1, T0))


if __name__ == "__main__":
    unittest.main()

"""Tests for the live-audio relay (app/lib/live_relay.py).

Run from backend/: venv/Scripts/python -m unittest discover -s tests
"""

import unittest

from app.lib import live_relay as lr


def adts(payload: bytes, profile: int = 1, sf_index: int = 3, channels: int = 2) -> bytes:
    """An ADTS frame around `payload`, built by hand from the spec rather
    than by the code under test."""
    length = 7 + len(payload)
    header = bytes(
        [
            0xFF,
            0xF1,  # MPEG-4, layer 0, no CRC
            (profile << 6) | (sf_index << 2) | (channels >> 2),
            ((channels & 0x03) << 6) | (length >> 11),
            (length >> 3) & 0xFF,
            ((length & 0x07) << 5) | 0x1F,
            0xFC,
        ]
    )
    return header + payload


def frames(count: int, start: int = 0) -> list:
    # Each payload differs, so a segment's bytes show which frames it holds.
    return [adts(bytes([(start + i) % 256]) * 5) for i in range(count)]


class SplitAdts(unittest.TestCase):
    def test_splits_back_to_back_frames(self):
        a, b = adts(b"aa"), adts(b"bbbb")
        got, rest = lr.split_adts(a + b)
        self.assertEqual(got, [a, b])
        self.assertEqual(rest, b"")

    def test_keeps_an_unfinished_frame_for_the_next_message(self):
        a, b = adts(b"aa"), adts(b"bbbbbb")
        got, rest = lr.split_adts(a + b[:5])
        self.assertEqual(got, [a])
        self.assertEqual(rest, b[:5])
        got2, rest2 = lr.split_adts(rest + b[5:])
        self.assertEqual(got2, [b])
        self.assertEqual(rest2, b"")

    def test_skips_garbage_to_the_next_sync_word(self):
        a = adts(b"aa")
        got, rest = lr.split_adts(b"\x00\x12\xff\x00" + a)
        self.assertEqual(got, [a])
        self.assertEqual(rest, b"")

    def test_reads_the_9_byte_header_length_with_a_crc(self):
        # protection_absent = 0: a 2-byte CRC follows the header.
        payload = b"cc"
        frame = bytearray(adts(b"\x00\x00" + payload))
        frame[1] = 0xF0
        got, _ = lr.split_adts(bytes(frame))
        self.assertEqual(got, [bytes(frame)])

    def test_a_crc_frame_needs_more_than_its_9_byte_header(self):
        crc_only = bytearray(adts(bytes(2)))  # length 9, all header
        crc_only[1] = 0xF0
        a = adts(b"aa")
        got, _ = lr.split_adts(bytes(crc_only) + a)
        self.assertEqual(got, [a])

    def test_a_length_no_longer_than_the_header_is_not_a_frame(self):
        bogus = bytearray(adts(b""))  # length 7: a header and nothing else
        a = adts(b"aa")
        got, _ = lr.split_adts(bytes(bogus) + a)
        self.assertEqual(got, [a])


class Format(unittest.TestCase):
    def test_reads_profile_rate_and_channels(self):
        self.assertEqual(lr.adts_format(adts(b"x", profile=1, sf_index=3, channels=2)), (1, 3, 2))
        self.assertEqual(lr.adts_format(adts(b"x", profile=0, sf_index=4, channels=1)), (0, 4, 1))
        self.assertEqual(lr.adts_format(adts(b"x", sf_index=11))[1], 11)
        # channel configuration 7 spans the byte boundary
        self.assertEqual(lr.adts_format(adts(b"x", channels=7))[2], 7)

    def test_a_frame_with_more_than_one_raw_data_block_is_not_expected(self):
        frame = bytearray(adts(b"x"))
        frame[6] = (frame[6] & 0xFC) | 0x01
        self.assertFalse(lr.is_expected_format(bytes(frame)))

    def test_only_48k_stereo_lc_is_expected(self):
        self.assertTrue(lr.is_expected_format(adts(b"x")))
        self.assertFalse(lr.is_expected_format(adts(b"x", sf_index=4)))
        self.assertFalse(lr.is_expected_format(adts(b"x", channels=1)))
        self.assertFalse(lr.is_expected_format(adts(b"x", profile=0)))


class Id3(unittest.TestCase):
    def test_matches_a_hand_built_tag(self):
        owner = b"com.apple.streaming.transportStreamTimestamp\x00"
        data = owner + (0x1_2345_6789).to_bytes(8, "big")
        self.assertEqual(len(data), 53)
        expected = b"ID3\x04\x00\x00\x00\x00\x00\x3f" + b"PRIV\x00\x00\x00\x35\x00\x00" + data
        self.assertEqual(lr.id3_timestamp(0x1_2345_6789), expected)

    def test_wraps_the_timestamp_at_33_bits(self):
        tag = lr.id3_timestamp((1 << 33) + 5)
        self.assertEqual(tag[-8:], (5).to_bytes(8, "big"))


class SegmenterTest(unittest.TestCase):
    def test_cuts_every_94_frames_with_timestamps_that_follow_on(self):
        seg = lr.Segmenter()
        first = seg.push(frames(94 * 2 + 10))
        self.assertEqual([s.seq for s in first], [0, 1])
        self.assertEqual([s.pts for s in first], [0, 94 * 1920])
        self.assertEqual([s.frames for s in first], [94, 94])
        # the 10 left over wait for the next push
        second = seg.push(frames(84, start=198))
        self.assertEqual([(s.seq, s.pts) for s in second], [(2, 2 * 94 * 1920)])

    def test_a_segment_is_its_timestamp_then_its_frames_in_order(self):
        batch = frames(94)
        [segment] = lr.Segmenter().push(batch)
        self.assertEqual(segment.data, lr.id3_timestamp(0) + b"".join(batch))

    def test_a_frame_is_1920_ticks_of_the_90khz_clock(self):
        self.assertEqual(lr.TICKS_PER_FRAME, 1920)

    def test_dropping_pending_frames_keeps_the_count(self):
        seg = lr.Segmenter()
        seg.push(frames(50))
        seg.drop_pending()
        [segment] = seg.push(frames(94))
        # 50 frames were counted before the drop, so the timeline has moved on
        self.assertEqual(segment.pts, 50 * 1920)
        self.assertEqual(segment.frames, 94)


class Playlist(unittest.TestCase):
    def segs(self, *seqs):
        return [lr.Segment(seq=s, pts=0, frames=94, data=b"") for s in seqs]

    def test_lists_segments_from_the_first_one_s_sequence_number(self):
        text = lr.render_playlist(self.segs(7, 8), ended=False)
        self.assertEqual(
            text,
            "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:7\n"
            "#EXTINF:2.005,\nseg/7.aac\n#EXTINF:2.005,\nseg/8.aac\n",
        )

    def test_closes_once_ended(self):
        self.assertTrue(lr.render_playlist(self.segs(1), ended=True).endswith("#EXT-X-ENDLIST\n"))
        self.assertNotIn("ENDLIST", lr.render_playlist(self.segs(1), ended=False))


class Checks(unittest.TestCase):
    def test_secret(self):
        self.assertEqual(lr.secret_check("k", ""), "unconfigured")
        self.assertEqual(lr.secret_check(None, "k"), "rejected")
        self.assertEqual(lr.secret_check("", "k"), "rejected")
        self.assertEqual(lr.secret_check("x", "k"), "rejected")
        self.assertEqual(lr.secret_check("k", "k"), "ok")

    def test_listen_only_while_live_and_not_hidden(self):
        self.assertTrue(lr.listen_available("playing", True))
        self.assertTrue(lr.listen_available("paused", True))
        self.assertFalse(lr.listen_available("playing", False))
        self.assertFalse(lr.listen_available("hidden", True))


class RelayTest(unittest.TestCase):
    def feed_segments(self, relay, token, count, start=0, now=0.0):
        relay.feed(token, b"".join(frames(94 * count, start)), now)

    def test_live_once_three_segments_exist(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 2)
        self.assertFalse(relay.is_live(0))
        self.feed_segments(relay, token, 1)
        self.assertTrue(relay.is_live(0))

    def test_a_frame_split_across_messages_is_kept(self):
        relay = lr.Relay()
        token = relay.connect(0)
        data = b"".join(frames(94))
        relay.feed(token, data[:100], 0)
        relay.feed(token, data[100:], 0)
        self.assertIsNotNone(relay.segment(0))

    def test_stays_live_through_the_grace_after_a_drop(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        relay.disconnect(token, 100)
        self.assertTrue(relay.is_live(100 + lr.GRACE_SECONDS - 0.1))
        self.assertFalse(relay.is_live(100 + lr.GRACE_SECONDS))

    def test_the_playlist_ends_once_the_grace_is_over(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        relay.disconnect(token, 100)
        self.assertNotIn("ENDLIST", relay.playlist(105))
        self.assertIn("ENDLIST", relay.playlist(111))

    def test_no_playlist_without_segments(self):
        relay = lr.Relay()
        relay.connect(0)
        self.assertIsNone(relay.playlist(0))

    def test_lists_only_the_newest_six(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 8)
        text = relay.playlist(0)
        self.assertIn("#EXT-X-MEDIA-SEQUENCE:2\n", text)
        self.assertEqual(text.count("#EXTINF"), 6)
        self.assertIn("seg/7.aac", text)

    def test_a_new_connection_replaces_the_old_and_its_late_close_is_ignored(self):
        relay = lr.Relay()
        old = relay.connect(0)
        self.feed_segments(relay, old, 3)
        new = relay.connect(1)
        self.assertFalse(relay.is_current(old))
        relay.feed(old, b"".join(frames(94)), 1)  # ignored
        self.assertIsNone(relay.segment(3))
        relay.disconnect(old, 2)  # the dead socket finally closing
        self.assertTrue(relay.is_current(new))
        self.assertIn("seg/2.aac", relay.playlist(3))
        # still live just after the old close, which a stolen close would end
        self.assertNotIn("ENDLIST", relay.playlist(2 + lr.GRACE_SECONDS - 5))

    def test_a_reconnect_within_the_grace_keeps_the_segments(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        relay.disconnect(token, 10)
        again = relay.connect(15)
        self.assertIsNotNone(relay.segment(0))
        self.feed_segments(relay, again, 1, now=15)
        # numbering carries on
        self.assertIsNotNone(relay.segment(3))

    def test_a_new_session_after_the_grace_starts_clean_but_numbers_carry_on(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        relay.disconnect(token, 10)
        again = relay.connect(10 + lr.GRACE_SECONDS + 1)
        self.assertIsNone(relay.playlist(30))
        self.assertIsNone(relay.segment(0))
        self.feed_segments(relay, again, 1, now=21)
        self.assertIn("#EXT-X-MEDIA-SEQUENCE:3\n", relay.playlist(30))

    def test_a_new_session_does_not_start_with_the_last_one_s_leftover_frames(self):
        relay = lr.Relay()
        token = relay.connect(0)
        relay.feed(token, b"".join(frames(94 * 3 + 50)), 0)  # 50 short of a segment
        relay.disconnect(token, 10)
        again = relay.connect(10 + lr.GRACE_SECONDS + 1)
        fresh = frames(94, start=100)
        relay.feed(again, b"".join(fresh), 21)
        [seq] = [s for s in range(10) if relay.segment(s) is not None]
        data = relay.segment(seq)
        self.assertEqual(data[len(lr.id3_timestamp(0)):], b"".join(fresh))

    def test_a_connected_phone_that_stops_sending_stops_being_live(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3, now=50)
        self.assertTrue(relay.is_live(50 + lr.GRACE_SECONDS - 0.1))
        self.assertFalse(relay.is_live(50 + lr.GRACE_SECONDS))
        self.assertIn("ENDLIST", relay.playlist(50 + lr.GRACE_SECONDS))

    def test_audio_arriving_again_makes_it_live_again(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3, now=0)
        self.assertFalse(relay.is_live(30))
        self.feed_segments(relay, token, 1, now=30)
        self.assertTrue(relay.is_live(30))

    def test_a_message_without_a_whole_frame_is_not_audio(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3, now=0)
        relay.feed(token, bytes(3), 9)
        self.assertFalse(relay.is_live(10))

    def test_nothing_is_served_while_sharing_is_hidden(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        relay.set_hidden(True)
        self.assertFalse(relay.is_live(0))
        self.assertIsNone(relay.playlist(0))
        self.assertIsNone(relay.segment(0))
        relay.set_hidden(False)
        self.assertTrue(relay.is_live(0))
        self.assertIsNotNone(relay.segment(0))

    def test_numbers_segments_from_first_seq(self):
        relay = lr.Relay(first_seq=5000)
        token = relay.connect(0)
        self.feed_segments(relay, token, 3)
        self.assertIsNone(relay.segment(0))
        self.assertIsNotNone(relay.segment(5000))
        self.assertIn("#EXT-X-MEDIA-SEQUENCE:5000\n", relay.playlist(0))

    def test_keeps_thirteen_segments_to_serve(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 15)
        self.assertIsNone(relay.segment(1))
        self.assertIsNotNone(relay.segment(2))

    def test_a_reconnect_stays_live_before_its_first_audio(self):
        relay = lr.Relay()
        token = relay.connect(0)
        self.feed_segments(relay, token, 3, now=0)
        relay.disconnect(token, 9)
        relay.connect(15)  # the phone back after a network change
        self.assertTrue(relay.is_live(20))
        self.assertNotIn("ENDLIST", relay.playlist(20))

    def test_rejects_another_format(self):
        relay = lr.Relay()
        token = relay.connect(0)
        with self.assertRaises(lr.BadFormat):
            relay.feed(token, adts(b"x", sf_index=4), 0)


if __name__ == "__main__":
    unittest.main()
